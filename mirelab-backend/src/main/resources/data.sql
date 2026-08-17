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
