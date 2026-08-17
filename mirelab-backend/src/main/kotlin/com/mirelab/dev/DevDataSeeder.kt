package com.mirelab.dev

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.UUID
import org.springframework.boot.CommandLineRunner
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper

/**
 * dev용 시드 데이터. 프론트 목(mocks/data.ts)과 값을 맞췄다.
 *
 * ddl-auto 로 스키마를 맡기고 있어서 data.sql 로는 감당이 안 됐다 — data.sql 은 매번
 * 새로 실행되는데, DB 가 영구적으로 바뀌면(H2 파일 모드·Postgres) 재시작할 때마다
 * 중복 키로 깨진다. 그래서 "비어있을 때만 시드" 가드를 두고 여기서 채운다.
 *
 * 엔티티는 @GeneratedValue(UUID) 라 프론트와 같은 고정 UUID 로 저장을 못 한다(Hibernate가
 * 미리 채워진 id 를 거부함 — repository.save 도, EntityManager.persist 도 둘 다 에러).
 * 그래서 이 시더만 JdbcTemplate 으로 SQL을 직접 낸다 — 엔티티·서비스 쪽은 손 안 댄다.
 */
@Component
class DevDataSeeder(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
) : CommandLineRunner {

    // ─── 고정 id ────────────────────────────────────────────
    private object Ids {
        val STUDY = uuid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

        val YEONGSEO = uuid("11111111-1111-1111-1111-111111111111")
        val HONAM = uuid("22222222-2222-2222-2222-222222222222")
        val HEENAM = uuid("33333333-3333-3333-3333-333333333333")
        val SEUNGWOO = uuid("44444444-4444-4444-4444-444444444444")

        // 사피엔스는 프론트 WorkPage 데모에서 이미 이 id 를 참조하고 있어 그대로 유지한다.
        val SAPIENS = uuid("d1111111-1111-1111-1111-111111111111")

        val W1 = uuid("22e7b0bb-df6e-40e9-b189-18282c82105c") // 인터스텔라
        val W2 = uuid("2378f6ca-e8ec-4d9f-9a9f-27a3c69610e1") // 총, 균, 쇠
        val W3 = uuid("4a0384c2-ddb5-4672-8a28-ffd9cce53695") // 소년이 온다
        val W4 = uuid("bae56364-c02c-41c9-be2a-45b1d995f05c") // 이기적 유전자
        val W5 = uuid("00e6c6d6-251f-4e41-acc2-44667761b344") // 오펜하이머
        val W7 = uuid("f40c190e-1362-4572-80c7-def0bfb7215d") // 듄: 파트 2
        val W8 = uuid("ac231803-2d6a-435a-b584-632468b8fe72") // 코스모스
        val W9 = uuid("111ea1a1-612a-423e-a221-ec27611e4722") // 파운데이션
        val W10 = uuid("51d31978-919a-42f3-8eee-ad054b955251") // 노르웨이의 숲
        val W11 = uuid("0b843a18-2415-4c05-a58d-2ef2925d8c1e") // 호모 데우스
        val W12 = uuid("c56570ac-39ef-4f96-8a7a-2092e0d70f5f") // 팩트풀니스
        val W13 = uuid("e9b49380-e9fb-4d95-806d-a49ac6da602c") // 파친코
        val W14 = uuid("fd5d3e34-0c69-4f70-991f-6ca9ea3a55a7") // 기생충
        val W15 = uuid("03bfc8f7-761d-4d1e-b5bb-88a418ddb080") // 정의란 무엇인가
        val P1 = uuid("18e11492-eb09-433e-9bfc-dcad634b52b6") // 아무튼, 계속 (개인)
        val P2 = uuid("155f0d3d-7937-4eb9-950f-6764d0dea9cb") // 컨설팅의 기술 (개인)

        val K1 = uuid("199e6fbb-a146-48d8-b75f-308382f27218")
        val K2 = uuid("ecad5d12-c520-4549-b255-6856024fa769")
        val K3 = uuid("1dc0b1dd-26c4-45ad-b593-ee05120ea23e")
        val K4 = uuid("3e13beb3-2546-4bab-9751-4092dbf50b49")
        val K5 = uuid("185d4db7-1d09-4c40-b101-5f34ccae109a")
        val K6 = uuid("a5ba20fe-77d5-48c4-8331-fab7f9b1c22b")

        val S1 = uuid("c45bf0b4-6906-4b76-bf45-3ac62b165180") // 평점
        val S2 = uuid("c9090e36-abd3-4c44-808c-cab9258e45b2") // 한줄평
        val S3 = uuid("99f9c4da-411d-42b2-b78e-f9422d077451") // 인상깊은 장면
        val S7 = uuid("2e48060c-21fc-4a87-8ad4-12ea6f6a4412") // 발제문 (숨김)
        val S9 = uuid("a2c88e5e-35f5-4a63-acdd-89f4a52d711e") // 내 요약
        val S10 = uuid("d94fc75f-2507-4a88-832f-0f5838076a6b") // 질문 · 토론거리
        val S11 = uuid("9dde3961-5177-4e90-b5de-05ca05907d5c") // 인상깊은 구절
        val S12 = uuid("4ceb7968-a937-4a6a-9d96-abf561f3943f") // 아쉬웠던 점

        private fun uuid(s: String) = UUID.fromString(s)
    }

    @Transactional
    override fun run(vararg args: String) {
        val alreadySeeded = jdbcTemplate.queryForObject("select count(*) from users", Int::class.java) ?: 0
        if (alreadySeeded > 0) return

        seedUsersAndStudy()
        seedWorks()
        seedSessions()
        seedSlotDefs()
        seedSlotValues()
    }

    private fun seedUsersAndStudy() {
        insertUser(Ids.YEONGSEO, "영서", "bg-emerald-500")
        insertUser(Ids.HONAM, "호남", "bg-sky-500")
        insertUser(Ids.HEENAM, "희남", "bg-amber-500")
        insertUser(Ids.SEUNGWOO, "승우", "bg-rose-500")

        jdbcTemplate.update(
            "insert into studies (id, slug, name, has_works) values (?, ?, ?, ?)",
            Ids.STUDY, "reading", "독서 스터디", true,
        )
        for (userId in listOf(Ids.YEONGSEO, Ids.HONAM, Ids.HEENAM, Ids.SEUNGWOO)) {
            jdbcTemplate.update(
                "insert into study_members (id, study_id, user_id) values (?, ?, ?)",
                UUID.randomUUID(), Ids.STUDY, userId,
            )
        }
    }

    private fun insertUser(id: UUID, name: String, color: String) {
        jdbcTemplate.update("insert into users (id, name, color) values (?, ?, ?)", id, name, color)
    }

    private data class WorkSeed(
        val id: UUID,
        val studyId: UUID?,
        val ownerId: UUID?,
        val kind: String,
        val title: String,
        val author: String,
        val year: Int,
        val status: String,
        val addedBy: UUID?,
        val reason: String?,
        val description: String?,
        val actors: List<String> = emptyList(),
    )

    private fun seedWorks() {
        val works = listOf(
            WorkSeed(
                Ids.W1, Ids.STUDY, null, "MOVIE", "인터스텔라", "크리스토퍼 놀란", 2014, "DONE",
                Ids.HEENAM, "다 같이 극장에서 본 뒤로 계속 얘기가 나와서",
                "지구가 황폐해진 미래, 인류의 새 터전을 찾아 웜홀 너머로 떠난 탐사대의 이야기.",
                listOf("매튜 맥커너히", "앤 해서웨이", "제시카 차스테인"),
            ),
            WorkSeed(
                Ids.W2, Ids.STUDY, null, "BOOK", "총, 균, 쇠", "재레드 다이아몬드", 1997, "DONE",
                Ids.YEONGSEO, "문명사를 한 번은 정리하고 넘어가고 싶었다",
                "왜 어떤 문명은 정복하고 어떤 문명은 정복당했는가 — 지리와 환경으로 읽는 인류사.",
            ),
            WorkSeed(
                Ids.W3, Ids.STUDY, null, "BOOK", "소년이 온다", "한강", 2014, "DONE",
                Ids.SEUNGWOO, "노벨상 받은 김에 제대로 읽어보자고",
                "1980년 광주, 죽은 자와 산 자의 목소리로 번갈아 증언하는 소설.",
            ),
            WorkSeed(
                Ids.W4, Ids.STUDY, null, "BOOK", "이기적 유전자", "리처드 도킨스", 1976, "DONE",
                Ids.HONAM, "진화 얘기가 나올 때마다 인용되는 책이라",
                "진화의 주인공은 개체가 아니라 유전자다 — 이기적 유전자 관점에서 본 생명 이야기.",
            ),
            WorkSeed(
                Ids.W5, Ids.STUDY, null, "MOVIE", "오펜하이머", "크리스토퍼 놀란", 2023, "DONE",
                Ids.HONAM, "개봉 때 놓친 사람이 많아서",
                "원자폭탄을 만든 물리학자 오펜하이머의 성공과 그 이후의 청문회를 그린 전기 영화.",
                listOf("킬리언 머피", "에밀리 블런트", "로버트 다우니 주니어"),
            ),
            WorkSeed(
                Ids.SAPIENS, Ids.STUDY, null, "BOOK", "사피엔스", "유발 하라리", 2015, "READING",
                Ids.YEONGSEO, "총, 균, 쇠 다음으로 자연스럽게 이어져서",
                "인지혁명부터 농업혁명, 과학혁명까지 — 호모 사피엔스가 세상을 지배하게 된 과정.",
            ),
            WorkSeed(
                Ids.W7, Ids.STUDY, null, "MOVIE", "듄: 파트 2", "드니 빌뇌브", 2024, "DONE",
                Ids.SEUNGWOO, "1편만 보고 멈춘 사람이 셋이나 있어서",
                "폴 아트레이데스가 프레멘과 함께 하코넨에 맞서 복수를 완성해가는 이야기.",
                listOf("티모시 샬라메", "젠데이아", "레베카 퍼거슨"),
            ),
            WorkSeed(
                Ids.W8, Ids.STUDY, null, "BOOK", "코스모스", "칼 세이건", 1980, "DONE",
                Ids.HEENAM, "과학책도 한 권쯤 섞고 싶었다",
                "우주의 기원부터 생명의 진화까지, 과학의 눈으로 훑는 거대한 시공간 여행.",
            ),
            WorkSeed(
                Ids.W9, Ids.STUDY, null, "BOOK", "파운데이션", "아이작 아시모프", 1951, "DONE",
                Ids.HEENAM, "SF 고전을 하나는 짚고 가자는 얘기가 있었다",
                "은하 제국의 몰락을 예견한 심리역사학자 셀던이 남긴 파운데이션 계획.",
            ),
            WorkSeed(
                Ids.W10, Ids.STUDY, null, "BOOK", "노르웨이의 숲", "무라카미 하루키", 1987, "DONE",
                Ids.HONAM, "가벼운 소설로 쉬어가는 회차",
                "와타나베가 두 여인 사이에서 상실과 사랑을 배워가는 청춘의 기억.",
            ),
            WorkSeed(
                Ids.W11, Ids.STUDY, null, "BOOK", "호모 데우스", "유발 하라리", 2017, "CANDIDATE",
                Ids.YEONGSEO, "사피엔스 마무리하면 바로 이어가자고",
                "기아·질병·전쟁을 넘어선 인류가 다음으로 좇을 신이 되려는 욕망을 그린다.",
            ),
            WorkSeed(
                Ids.W12, Ids.STUDY, null, "BOOK", "팩트풀니스", "한스 로슬링", 2019, "CANDIDATE",
                Ids.HEENAM, "통계로 세상 보는 감각을 키우고 싶어서",
                "우리가 세상을 실제보다 더 나쁘게 보는 열 가지 본능과, 데이터로 고치는 법.",
            ),
            WorkSeed(
                Ids.W13, Ids.STUDY, null, "BOOK", "파친코", "이민진", 2017, "CANDIDATE",
                Ids.SEUNGWOO, "드라마 보고 원작이 궁금해졌다",
                "일제강점기부터 현대까지, 이역만리 일본에서 뿌리내린 한 가족 4대의 이야기.",
            ),
            WorkSeed(
                Ids.W14, Ids.STUDY, null, "MOVIE", "기생충", "봉준호", 2019, "CANDIDATE",
                Ids.HONAM, "영화도 한 편씩 섞어보자",
                "반지하 가족이 부잣집에 하나둘 얹혀살게 되며 벌어지는 계급의 블랙코미디.",
                listOf("송강호", "이선균", "조여정", "최우식"),
            ),
            WorkSeed(
                Ids.W15, Ids.STUDY, null, "BOOK", "정의란 무엇인가", "마이클 샌델", 2010, "CANDIDATE",
                Ids.YEONGSEO, "토론 붙기 좋은 주제라",
                "공리주의부터 자유지상주의까지, 정의를 둘러싼 철학적 딜레마를 사례로 풀어낸다.",
            ),
            WorkSeed(
                Ids.P1, null, Ids.YEONGSEO, "BOOK", "아무튼, 계속", "김교석", 2019, "DONE",
                null, null, "좋아하는 걸 계속하는 삶에 대한 담담하고 다정한 에세이.",
            ),
            WorkSeed(
                Ids.P2, null, Ids.YEONGSEO, "BOOK", "컨설팅의 기술", "제럴드 와인버그", 2004, "READING",
                null, null, "문제 해결과 컨설팅 현장에서 통하는 원칙을 짧은 법칙들로 정리한 책.",
            ),
        )

        for (w in works) {
            jdbcTemplate.update(
                """insert into works
                   (id, study_id, owner_id, kind, title, author, published_year, status, added_by, reason, description)
                   values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                w.id, w.studyId, w.ownerId, w.kind, w.title, w.author, w.year, w.status, w.addedBy, w.reason,
                w.description,
            )
            w.actors.forEachIndexed { index, actor ->
                jdbcTemplate.update(
                    "insert into work_actors (work_id, position, actor) values (?, ?, ?)",
                    w.id, index, actor,
                )
            }
        }
    }

    private fun seedSessions() {
        // 최신이 앞에 오는 순서로 두던 프론트 목과 달리, 여기는 그냥 각자 시각을 담는다 — 정렬은 조회 쪽 책임.
        val sessions = listOf(
            Triple(Ids.K6, Ids.SAPIENS, null as LocalDateTime?),
            Triple(Ids.K5, Ids.SAPIENS, dateTime("2026-08-17T20:00")),
            Triple(Ids.K4, Ids.SAPIENS, dateTime("2026-08-10T20:00")),
            Triple(Ids.K3, Ids.SAPIENS, dateTime("2026-08-03T20:00")),
            Triple(Ids.K2, Ids.W2, dateTime("2026-07-27T20:00")),
            Triple(Ids.K1, Ids.W2, dateTime("2026-07-20T20:00")),
        )
        val closedIds = setOf(Ids.K4, Ids.K3, Ids.K2, Ids.K1)
        for ((id, workId, meetAt) in sessions) {
            jdbcTemplate.update(
                "insert into sessions (id, study_id, work_id, meet_at, closed) values (?, ?, ?, ?, ?)",
                id, Ids.STUDY, workId, meetAt?.let { Instant.from(it.atOffset(ZoneOffset.UTC)) }, id in closedIds,
            )
        }
    }

    private fun dateTime(s: String) = LocalDateTime.parse(s)

    private data class SlotDefSeed(
        val id: UUID,
        val name: String,
        val type: String,
        val order: Int,
        val hidden: Boolean = false,
    )

    private fun seedSlotDefs() {
        val defs = listOf(
            SlotDefSeed(Ids.S1, "평점", "RATING", 1),
            SlotDefSeed(Ids.S2, "한줄평", "TEXT_SHORT", 2),
            SlotDefSeed(Ids.S3, "인상깊은 장면", "LIST", 3),
            SlotDefSeed(Ids.S7, "발제문", "TEXT_LONG", 7, hidden = true),
            SlotDefSeed(Ids.S9, "내 요약", "TEXT_LONG", 1),
            SlotDefSeed(Ids.S10, "질문 · 토론거리", "LIST", 2),
            SlotDefSeed(Ids.S11, "인상깊은 구절", "LIST", 5),
            SlotDefSeed(Ids.S12, "아쉬웠던 점", "LIST", 4),
        )
        for (d in defs) {
            jdbcTemplate.update(
                """insert into slot_defs (id, study_id, name, type, visibility, owner, sort_order, hidden)
                   values (?, ?, ?, ?, 'ALWAYS', 'STUDY', ?, ?)""",
                d.id, Ids.STUDY, d.name, d.type, d.order, d.hidden,
            )
        }
    }

    private data class ValueSeed(
        val workId: UUID,
        val slotDefId: UUID,
        val userId: UUID,
        val value: Map<String, Any?>,
        val context: String = "STUDY",
    )

    private fun seedSlotValues() {
        val values = mutableListOf<ValueSeed>()

        // 작품별 [영서, 호남, 희남, 승우] 평점 — 0.1 단위라 어중간한 값이 섞인다.
        val memberOrder = listOf(Ids.YEONGSEO, Ids.HONAM, Ids.HEENAM, Ids.SEUNGWOO)
        val workRatings = mapOf(
            Ids.W1 to listOf(5.0, 4.8, 5.0, 4.5),
            Ids.W2 to listOf(5.0, 4.2, 4.7, 4.0),
            Ids.W3 to listOf(4.8, 5.0, 4.3, 4.0),
            Ids.W4 to listOf(4.0, 4.6, 4.2, 4.0),
            Ids.W5 to listOf(4.1, 4.5, 4.0, 4.3),
            Ids.W7 to listOf(4.0, 3.2, 4.1, 3.8),
            Ids.W8 to listOf(3.9, 4.0, 3.4, 4.0),
            Ids.W9 to listOf(3.2, 3.8, 4.0, 3.0),
            Ids.W10 to listOf(3.0, 2.8, 3.6, 3.1),
        )
        for ((workId, scores) in workRatings) {
            scores.forEachIndexed { i, n ->
                values += ValueSeed(workId, Ids.S1, memberOrder[i], mapOf("n" to n))
            }
        }

        // 사피엔스는 아직 읽는 중이라 다 안 매겼다.
        values += ValueSeed(Ids.SAPIENS, Ids.S1, Ids.YEONGSEO, mapOf("n" to 4.5))
        values += ValueSeed(Ids.SAPIENS, Ids.S1, Ids.HEENAM, mapOf("n" to 4.0))

        // 한줄평
        values += ValueSeed(Ids.W2, Ids.S2, Ids.YEONGSEO, mapOf("text" to "두껍지만 끝까지 밀고 간다"))
        values += ValueSeed(Ids.W2, Ids.S2, Ids.HONAM, mapOf("text" to "지리 결정론이 과한 대목이 있다"))
        values += ValueSeed(Ids.W3, Ids.S2, Ids.YEONGSEO, mapOf("text" to "문장이 오래 남는다"))
        values += ValueSeed(Ids.W1, Ids.S2, Ids.HEENAM, mapOf("text" to "극장에서 다시 보고 싶다"))

        // 사피엔스 준비 기록
        values += ValueSeed(
            Ids.SAPIENS, Ids.S10, Ids.YEONGSEO,
            mapOf("items" to listOf("농업혁명이 개인에겐 재앙이었다는 주장, 어디까지 동의하나")),
        )
        values += ValueSeed(
            Ids.SAPIENS, Ids.S9, Ids.HONAM,
            mapOf("text" to "수렵채집에서 농업으로 넘어가며 개인의 삶의 질은 오히려 나빠졌다는 게 1부의 핵심."),
        )
        values += ValueSeed(
            Ids.SAPIENS, Ids.S10, Ids.HONAM,
            mapOf("items" to listOf("상상의 질서는 어떻게 유지되나", "화폐를 신뢰의 시스템이라 부르는 게 적절한가")),
        )
        values += ValueSeed(
            Ids.SAPIENS, Ids.S11, Ids.HONAM,
            mapOf("items" to listOf("우리는 밀을 길들이지 않았다. 밀이 우리를 길들였다")),
        )
        values += ValueSeed(
            Ids.W2, Ids.S10, Ids.HEENAM,
            mapOf("items" to listOf("지리가 전부라면 개인의 선택은 어디에 남나")),
        )
        values += ValueSeed(
            Ids.SAPIENS, Ids.S3, Ids.HONAM,
            mapOf("items" to listOf("우리는 밀을 길들이지 않았다", "화폐는 상호 신뢰의 시스템")),
        )
        values += ValueSeed(
            Ids.SAPIENS, Ids.S3, Ids.YEONGSEO,
            mapOf("items" to listOf("상상의 질서는 무너지지 않는다")),
        )

        // 영서의 내 서재 평점 — 스터디 쪽 기록과 안 겹치도록 SHELF 컨텍스트를 쓴다.
        val shelfRatings = mapOf(
            Ids.W1 to 4.5, Ids.W2 to 4.0, Ids.W3 to 5.0, Ids.W4 to 3.5, Ids.W5 to 4.0,
            Ids.W7 to 3.0, Ids.W8 to 4.5, Ids.W9 to 2.5, Ids.W10 to 3.5, Ids.P1 to 4.0,
        )
        for ((workId, n) in shelfRatings) {
            values += ValueSeed(workId, Ids.S1, Ids.YEONGSEO, mapOf("n" to n), context = "SHELF")
        }

        for (v in values) {
            jdbcTemplate.update(
                """insert into slot_values (id, work_id, slot_def_id, user_id, value_json, draft, context)
                   values (?, ?, ?, ?, ?, ?, ?)""",
                UUID.randomUUID(), v.workId, v.slotDefId, v.userId, objectMapper.writeValueAsString(v.value), false,
                v.context,
            )
        }
    }
}
