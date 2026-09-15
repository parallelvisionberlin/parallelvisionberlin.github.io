import { createHash } from 'node:crypto';

export const upstreamStreamingClientSha256 = '111ec3ce689f5e451b5b5d072853dc3aa586f2fffa8688c997f92daf534da2d2';
export function patchCaptureCancellation(source) {
  const hash = createHash('sha256').update(source).digest('hex');
  if (hash !== upstreamStreamingClientSha256) throw new Error('Unexpected Anam 4.27.0 source; review the patch before upgrading.');
  const original = `                this.inputAudioStream = yield navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                });`;
  const replacement = `                // PV: a microphone permission request can outlive shutdown.
                const captureConnection = this.peerConnection;
                const capturedStream = yield navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                });
                if (!captureConnection || this.peerConnection !== captureConnection ||
                    captureConnection.connectionState === 'closed' || this.iceRestartStopped) {
                    capturedStream.getTracks().forEach(track => track.stop());
                    return;
                }
                this.inputAudioStream = capturedStream;`;
  if (source.split(original).length !== 3) throw new Error('Expected exactly the initial and device-change capture sites.');
  return source.replaceAll(original, replacement);
}
