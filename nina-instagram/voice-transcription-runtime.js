// Embedded into the production nina-instagram module; not a standalone Worker.
// Voice attachments arrive only after the existing signed Meta webhook check.
const NINA_VOICE_PENDING = '[Voice note awaiting transcription]';
const NINA_VOICE_FAILED = '[Voice note could not be transcribed]';
const NINA_VOICE_MAX_BYTES = 8 * 1024 * 1024;

function ninaVoiceAttachment(message) {
  const list = Array.isArray(message?.attachments) ? message.attachments : (message?.attachment ? [message.attachment] : []);
  const a = list.find(item => {
    const type = String(item?.type || '').toLowerCase();
    const mime = String(item?.mime_type || item?.payload?.mime_type || '').toLowerCase();
    const name = String(item?.payload?.url || item?.payload?.file_name || '');
    return type === 'audio' || type === 'voice' ||
      (type === 'file' && (mime.startsWith('audio/') || /\.(?:m4a|mp3|ogg|opus|wav|aac)(?:\?|$)/i.test(name)));
  });
  if (!a) return null;
  const url = String(a?.payload?.url || a?.url || '');
  return { url: url.length <= 8192 ? url : '' };
}

function ninaSafeVoiceUrl(value) {
  try {
    const u = new URL(String(value || ''));
    const h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
    if (!(
      h.endsWith('.fbcdn.net') || h === 'fbcdn.net' ||
      h.endsWith('.fbsbx.com') || h === 'fbsbx.com' ||
      h.endsWith('.cdninstagram.com') || h === 'cdninstagram.com' ||
      h === 'lookaside.instagram.com'
    )) return null;
    return u.toString();
  } catch { return null; }
}

async function ninaVoiceUrlFromMeta(env, messageId) {
  if (!env.INSTAGRAM_ACCESS_TOKEN) return null;
  const response = await fetch(
    'https://graph.instagram.com/v26.0/' + encodeURIComponent(messageId) + '?fields=attachments',
    { headers: { Authorization: 'Bearer ' + env.INSTAGRAM_ACCESS_TOKEN }, signal: AbortSignal.timeout(9000) }
  );
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  const entries = Array.isArray(data?.attachments?.data) ? data.attachments.data : [];
  for (const entry of entries) {
    const address = entry?.file_url || entry?.url || entry?.payload?.url || entry?.audio_data?.url;
    const allowed = ninaSafeVoiceUrl(address);
    if (allowed) return allowed;
  }
  return null;
}

async function ninaDownloadVoice(url) {
  let current = ninaSafeVoiceUrl(url);
  if (!current) throw new Error('VOICE_URL_UNAVAILABLE');
  for (let redirect = 0; redirect < 3; redirect++) {
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      current = ninaSafeVoiceUrl(new URL(response.headers.get('location') || '', current).toString());
      if (!current) throw new Error('VOICE_REDIRECT_BLOCKED');
      continue;
    }
    if (!response.ok) throw new Error('VOICE_MEDIA_UNAVAILABLE');
    const mime = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (mime && !mime.startsWith('audio/') && mime !== 'application/octet-stream' && mime !== 'video/mp4')
      throw new Error('VOICE_NOT_AUDIO');
    const size = Number(response.headers.get('content-length') || 0);
    if (size > NINA_VOICE_MAX_BYTES) throw new Error('VOICE_TOO_LARGE');
    if (!response.body) throw new Error('VOICE_EMPTY');
    const reader = response.body.getReader(), parts = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > NINA_VOICE_MAX_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error('VOICE_TOO_LARGE');
      }
      parts.push(value);
    }
    if (length < 128) throw new Error('VOICE_EMPTY');
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return bytes;
  }
  throw new Error('VOICE_TOO_MANY_REDIRECTS');
}

function ninaVoiceBase64(bytes) {
  let raw = '';
  for (let i = 0; i < bytes.length; i += 16384) {
    raw += String.fromCharCode(...bytes.subarray(i, i + 16384));
  }
  return btoa(raw);
}

async function ninaTranscribeVoice(env, item) {
  let mediaUrl = ninaSafeVoiceUrl(item.audio?.url);
  let bytes;
  if (mediaUrl) {
    try { bytes = await ninaDownloadVoice(mediaUrl); }
    catch { /* A Meta-hosted URL may have expired; retry through the Graph message endpoint. */ }
  }
  if (!bytes) {
    mediaUrl = await ninaVoiceUrlFromMeta(env, item.messageId);
    if (!mediaUrl) throw new Error('VOICE_URL_UNAVAILABLE');
    bytes = await ninaDownloadVoice(mediaUrl);
  }
  const result = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: ninaVoiceBase64(bytes),
    task: 'transcribe',
    vad_filter: true,
    condition_on_previous_text: false
  });
  const transcript = String(result?.text || '').replace(/\s+/g, ' ').trim();
  if (transcript.length < 2 || !/[\p{L}\p{N}]/u.test(transcript)) throw new Error('VOICE_NO_SPEECH');
  return transcript.slice(0, 3900);
}

async function ninaHandleVoice(env, item) {
  const db = env.IG_MEMORY_DB;
  if (!db || !env.AI) return;
  await initializePublicRelease(env);
  const config = await db.prepare('SELECT mode FROM ig_autoreply_config WHERE id=1').first();
  // No audio is fetched from strangers during the controlled tester phase.
  if (config?.mode === 'tester') {
    const tester = await db.prepare('SELECT 1 AS ok FROM ig_autoreply_testers WHERE instagram_user_id=?')
      .bind(item.senderId).first();
    if (!tester?.ok) return;
  } else if (!(config?.mode === 'public' && publicVoiceEnabled(env))) return;
  if (await db.prepare('SELECT 1 FROM ig_optouts WHERE instagram_user_id=?').bind(item.senderId).first()) return;
  await db.prepare('INSERT INTO ig_contacts (instagram_user_id) VALUES (?) ON CONFLICT(instagram_user_id) DO UPDATE SET last_seen_at=CURRENT_TIMESTAMP')
    .bind(item.senderId).run();
  // The placeholder reserves the original Meta message ID and its ordering, so redeliveries
  // cannot incur another speech-to-text charge or produce a second response.
  const claim = await db.prepare("INSERT OR IGNORE INTO ig_messages (message_id,instagram_user_id,direction,body) VALUES (?,?,'incoming',?)")
    .bind(item.messageId, item.senderId, NINA_VOICE_PENDING).run();
  if (Number(claim?.meta?.changes || 0) !== 1) return;
  await db.prepare("INSERT OR IGNORE INTO ig_processing (incoming_message_id,status) VALUES (?,'processing')")
    .bind(item.messageId).run();
  try {
    const transcript = await ninaTranscribeVoice(env, item);
    await db.prepare('UPDATE ig_messages SET body=? WHERE message_id=? AND instagram_user_id=?')
      .bind(transcript, item.messageId, item.senderId).run();
    await db.prepare("UPDATE ig_processing SET status='received',last_error_code=NULL,updated_at=CURRENT_TIMESTAMP WHERE incoming_message_id=?")
      .bind(item.messageId).run();
    // Uses Nina's existing delay, memory, rate limits, and text DM sending code.
    await queueHumanPacedReply(env, item.senderId, item.messageId, transcript);
  } catch (error) {
    const code = /^VOICE_[A-Z_]+$/.test(String(error?.message)) ? error.message : 'VOICE_TRANSCRIPTION_FAILED';
    console.error('NINA_IG_VOICE_ERROR', code); // Never log audio, URLs or transcripts.
    await db.prepare('UPDATE ig_messages SET body=? WHERE message_id=? AND instagram_user_id=?')
      .bind(NINA_VOICE_FAILED, item.messageId, item.senderId).run();
    await db.prepare("UPDATE ig_processing SET status='failed',last_error_code=?,updated_at=CURRENT_TIMESTAMP WHERE incoming_message_id=?")
      .bind(code, item.messageId).run();
  }
}
