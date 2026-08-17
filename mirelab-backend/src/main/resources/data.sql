-- dev용 시드 — 프론트 목(mocks/data.ts)과 값을 맞췄다.
insert into users (id, name, color) values
  ('11111111-1111-1111-1111-111111111111', '영서', 'bg-emerald-500'),
  ('22222222-2222-2222-2222-222222222222', '호남', 'bg-sky-500'),
  ('33333333-3333-3333-3333-333333333333', '희남', 'bg-amber-500'),
  ('44444444-4444-4444-4444-444444444444', '승우', 'bg-rose-500');

insert into studies (id, slug, name, has_works) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'reading', '독서 스터디', true);

insert into study_members (id, study_id, user_id) values
  ('b1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
  ('b3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333'),
  ('b4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444');

insert into slot_defs (id, study_id, name, type, visibility, owner, session_id, sort_order, hidden) values
  ('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '평점', 'RATING', 'ALWAYS', 'STUDY', null, 1, false),
  ('c2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '한줄평', 'TEXT_SHORT', 'ALWAYS', 'STUDY', null, 2, false);

insert into works (id, study_id, owner_id, kind, title, author, published_year, status, added_by, reason, description) values
  ('d1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'BOOK', '사피엔스', '유발 하라리', 2015, 'DONE', '11111111-1111-1111-1111-111111111111', '다같이 읽고 싶어서', null);

insert into slot_values (id, work_id, slot_def_id, user_id, value_json, draft) values
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"n": 5}', false),
  ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '{"n": 4}', false);
