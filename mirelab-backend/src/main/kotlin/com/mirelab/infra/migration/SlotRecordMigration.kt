package com.mirelab.infra.migration

import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

/**
 * 옛 범용 칸(`slot_defs` / `slot_values`)에 쌓여 있던 기록을 새 테이블로 옮기고, 옮긴 뒤
 * 옛 테이블을 지운다. **딱 한 번만 할 일이다** — 옛 테이블이 없으면 곧바로 돌아간다.
 *
 * 복사와 삭제를 한 트랜잭션에 묶은 이유: PostgreSQL 은 DDL 도 트랜잭션 안에서 돈다.
 * 옮기다 무엇 하나라도 터지면 통째로 되감기고 옛 테이블은 그대로 남는다 — 반쯤 옮긴 채
 * 원본만 사라지는 상태가 만들어지지 않는다.
 *
 * 옮기는 규칙은 지워진 SlotService 의 판정을 그대로 옮겨 적은 것이다:
 * 별점은 스터디의 첫 RATING 칸, 한줄평은 첫 non-PRIVATE TEXT_SHORT 칸(정렬 순서 기준),
 * 그 둘을 뺀 나머지 개인 칸은 전부 메모였다.
 *
 * 이 코드가 모든 환경에서 한 번씩 돌고 나면 통째로 지워도 된다.
 */
@Order(SLOT_MIGRATION_ORDER)
@Component
class SlotRecordMigration(
    private val jdbcTemplate: JdbcTemplate,
) : CommandLineRunner {
    private val logger = LoggerFactory.getLogger(this::class.java)

    @Transactional
    override fun run(vararg args: String) {
        if (!slotTablesExist()) return

        val ratings = jdbcTemplate.update(MOVE_RATINGS)
        val notes = jdbcTemplate.update(MOVE_NOTES)

        // 내용이 있는데 어느 쪽으로도 안 간 값이 있으면 옮기는 규칙에 구멍이 있는 것이다.
        // 그대로 지우면 조용히 사라지므로, 되감고 다음 기동에 다시 시도하게 한다.
        val stranded = jdbcTemplate.queryForObject(STRANDED_COUNT, Int::class.java) ?: 0
        check(stranded == 0) {
            "옮기지 못한 칸 값이 $stranded 건 남아 옛 테이블을 지우지 않았습니다 — 규칙을 확인해 주세요"
        }

        jdbcTemplate.execute("drop table slot_values")
        jdbcTemplate.execute("drop table slot_defs")
        logger.info("옛 칸 기록을 옮겼습니다 — 평가 {}건, 메모 {}건. slot_defs/slot_values 는 지웠습니다", ratings, notes)
    }

    /**
     * 테이블 이름을 소문자로 맞춰 보는 이유: 테스트에서 쓰는 H2 는 이름을 대문자로 담는다.
     * 그 환경에는 애초에 옛 테이블이 없으므로 여기서 곧바로 돌아간다.
     */
    private fun slotTablesExist(): Boolean {
        val count = jdbcTemplate.queryForObject(
            """select count(*) from information_schema.tables
               where lower(table_name) in ('slot_defs', 'slot_values')""",
            Int::class.java,
        ) ?: 0
        return count == 2
    }

    private companion object {
        /**
         * 어느 칸이 별점이고 어느 칸이 한줄평인가 — 스터디마다 하나씩 고른다.
         * 두 CTE 는 아래 두 문장이 같이 쓰므로 문자열로 한 번만 적어 둔다.
         */
        const val BUNDLE_SLOTS = """
            rating_slot as (
                select distinct on (study_id) study_id, id
                from slot_defs where not hidden and type = 'RATING'
                order by study_id, sort_order, id
            ),
            blurb_slot as (
                select distinct on (study_id) study_id, id
                from slot_defs where not hidden and type = 'TEXT_SHORT' and visibility <> 'PRIVATE'
                order by study_id, sort_order, id
            )
        """

        /**
         * 예전에 BlockNote 로 저장된 `{ "blocks": [...] }` 에서 글자만 훑어 낸다.
         * 옮기는 문장과 확인하는 문장이 **같은 식**을 봐야 한다 — 한쪽만 고치면 "옮겼다고
         * 치는데 실은 빈 글" 이거나 그 반대가 되어, 확인이 확인 구실을 못 한다.
         */
        const val BLOCK_TEXT = """
            (
                select nullif(btrim(string_agg(line, chr(10))), '')
                from jsonb_array_elements(
                    coalesce(v.value_json::jsonb -> 'blocks', '[]'::jsonb)
                ) block,
                lateral (
                    select coalesce(string_agg(inline ->> 'text', ''), '')
                    from jsonb_array_elements(
                        coalesce(block -> 'content', '[]'::jsonb)
                    ) inline
                ) flat(line)
            )
        """

        /** 목록 칸의 항목 중 글자가 든 것의 수 */
        const val ITEM_COUNT = """
            (
                select count(*) from jsonb_array_elements_text(
                    coalesce(v.value_json::jsonb -> 'items', '[]'::jsonb)
                ) item where btrim(item) <> ''
            )
        """

        /** 글 상자 칸의 글자 — `{ "text": ... }` 이거나 옛 BlockNote 블록 */
        const val LONG_TEXT = """
            coalesce(
                nullif(btrim(coalesce(v.value_json::jsonb ->> 'text', '')), ''),
                $BLOCK_TEXT
            )
        """

        /** 별점과 한줄평을 (작품, 사람) 한 행으로 모은다. 공개 여부는 별점 쪽 값을 따른다 */
        const val MOVE_RATINGS = """
            with $BUNDLE_SLOTS,
            bundle as (
                select v.work_id,
                       v.user_id,
                       max(case when v.slot_def_id = r.id
                                then (v.value_json::jsonb ->> 'n')::double precision end) as score,
                       max(case when v.slot_def_id = b.id
                                then nullif(btrim(coalesce(v.value_json::jsonb ->> 'text', '')), '') end) as blurb,
                       bool_or(v.slot_def_id = r.id and v.published) as published
                from slot_values v
                left join rating_slot r on r.id = v.slot_def_id
                left join blurb_slot b on b.id = v.slot_def_id
                where r.id is not null or b.id is not null
                group by v.work_id, v.user_id
            )
            insert into work_ratings (id, work_id, user_id, score, blurb, published, created_at, updated_at)
            select gen_random_uuid(), work_id, user_id, score, blurb, coalesce(published, false), now(), now()
            from bundle
            where score is not null or blurb is not null
            on conflict (work_id, user_id) do nothing
        """

        /**
         * 나머지 개인 칸은 전부 메모였다. 목록 칸은 항목 하나가 메모 한 장이 되고, 글 상자
         * 칸은 통째로 한 장이 된다. 종류는 칸 이름에서 읽는다 — 그 스터디가 무엇을 적으라고
         * 했는지가 이름에 남아 있는 유일한 자리다.
         */
        const val MOVE_NOTES = """
            with $BUNDLE_SLOTS,
            note_slot as (
                select d.id, d.type,
                       case when d.name like '%질문%' or d.name like '%토론%' then 'QUESTION'
                            when d.name like '%구절%' or d.name like '%인용%' then 'QUOTE'
                            else 'MEMO' end as kind
                from slot_defs d
                left join rating_slot r on r.id = d.id
                left join blurb_slot b on b.id = d.id
                where r.id is null and b.id is null and d.type <> 'RATING'
            ),
            long_notes as (
                select v.work_id, v.user_id, s.kind, $LONG_TEXT as body
                from slot_values v
                join note_slot s on s.id = v.slot_def_id
                where s.type in ('TEXT_LONG', 'TEXT_SHORT')
            ),
            list_notes as (
                select v.work_id, v.user_id, s.kind, btrim(item) as body
                from slot_values v
                join note_slot s on s.id = v.slot_def_id,
                lateral jsonb_array_elements_text(
                    coalesce(v.value_json::jsonb -> 'items', '[]'::jsonb)
                ) item
                where s.type = 'LIST'
            )
            insert into work_notes (id, work_id, author_id, kind, body, created_at, updated_at)
            select gen_random_uuid(), work_id, user_id, kind, body, now(), now()
            from (select * from long_notes union all select * from list_notes) n
            where body is not null and body <> ''
        """

        /**
         * "내용이 있는데 갈 곳이 없었던" 값의 수. 빈 값은 옮길 것이 없으니 안 옮긴 게 맞고,
         * 여기서도 안 센다.
         *
         * 실제로 걸릴 수 있는 구멍은 하나다 — 한 스터디에 RATING 칸이 둘 이상이면 첫 칸만
         * 평가로 가고 나머지는 메모 대상에서도 빠진다(`d.type <> 'RATING'`). 그 밖에도
         * 무엇이든 흘리면 여기 잡히게, 값의 종류별로 갈 곳이 정해졌는지를 그대로 따진다.
         */
        const val STRANDED_COUNT = """
            with $BUNDLE_SLOTS,
            note_slot as (
                select d.id, d.type
                from slot_defs d
                left join rating_slot r on r.id = d.id
                left join blurb_slot b on b.id = d.id
                where r.id is null and b.id is null and d.type <> 'RATING'
            )
            select count(*)
            from slot_values v
            join slot_defs d on d.id = v.slot_def_id
            left join rating_slot r on r.id = d.id
            left join blurb_slot b on b.id = d.id
            left join note_slot n on n.id = d.id
            where
                -- 옮길 내용이 있다
                (
                    v.value_json::jsonb ->> 'n' is not null
                    or $LONG_TEXT is not null
                    or $ITEM_COUNT > 0
                )
                -- 그런데 그 내용이 어느 쪽으로도 안 갔다
                and not (
                    (r.id is not null and v.value_json::jsonb ->> 'n' is not null)
                    or (b.id is not null and $LONG_TEXT is not null)
                    or (
                        n.id is not null
                        and (
                            (n.type in ('TEXT_LONG', 'TEXT_SHORT') and $LONG_TEXT is not null)
                            or (n.type = 'LIST' and $ITEM_COUNT > 0)
                        )
                    )
                )
        """
    }
}

/** MockUserCleanup 보다 앞 — 옮긴 뒤에 목 사용자 기록을 치워야 한다 */
const val SLOT_MIGRATION_ORDER = Ordered.HIGHEST_PRECEDENCE + 5
