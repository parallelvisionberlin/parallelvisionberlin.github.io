-- Read projections preserve original audit transcripts. Commands require owner identity.
CREATE VIEW nina_scoped_messages AS
SELECT m.rowid AS rowid, m.*,
 CASE WHEN EXISTS (SELECT 1 FROM users u WHERE u.memory_visitor_id=m.visitor_id AND u.role='owner') THEN COALESCE((SELECT control.rowid FROM messages control WHERE control.visitor_id=m.visitor_id
 AND control.conversation_id=m.conversation_id AND control.role='user' AND control.rowid<=m.rowid
 AND replace(trim(lower(control.content), ' .!?'), ' ', '') IN ('vladimirninotchka','vladimirninotchkafin')
 ORDER BY control.rowid DESC LIMIT 1),0) ELSE 0 END AS memory_segment,
 CASE WHEN EXISTS (SELECT 1 FROM users u WHERE u.memory_visitor_id=m.visitor_id AND u.role='owner')
 AND (
   (m.role='user' AND replace(trim(lower(m.content), ' .!?'), ' ', '') IN ('vladimirninotchka','vladimirninotchkafin'))
   OR COALESCE((SELECT replace(trim(lower(control.content), ' .!?'), ' ', '') FROM messages control
     WHERE control.visitor_id=m.visitor_id AND control.conversation_id=m.conversation_id
       AND control.role='user' AND control.rowid<=m.rowid
       AND replace(trim(lower(control.content), ' .!?'), ' ', '') IN ('vladimirninotchka','vladimirninotchkafin')
     ORDER BY control.rowid DESC LIMIT 1),'')='vladimirninotchka'
 ) THEN 'technical' ELSE 'personal' END AS memory_scope
FROM messages m;
CREATE VIEW nina_personal_messages AS SELECT * FROM nina_scoped_messages WHERE memory_scope='personal';
