package com.mirelab.domain.work

/**
 * "같은 창작물"인지 판별하는 정규화 키. ISBN 같은 외부 식별자가 없을 때(수동 입력,
 * 영화)의 최선일 뿐이라 부제·문장부호 차이나 오탈자는 다른 키로 갈라질 수 있다.
 */
object WorkMatchKey {
    private val trailingParen = Regex("""[(（][^)）]*[)）]\s*$""")
    private val roleAnnotation =
        Regex("""[(（](지은이|글쓴이|엮은이|옮긴이|편저자|편역자|저자|역자|감독|연출)[)）]""")
    private val whitespace = Regex("""\s+""")

    fun compute(kind: WorkKind, title: String, author: String): String =
        "${kind.name.lowercase()}::${normalizeTitle(title)}::${normalizeAuthor(author)}"

    private fun normalizeTitle(raw: String): String {
        var t = raw.trim()
        while (true) {
            val stripped = trailingParen.replace(t, "").trim()
            if (stripped == t) break
            t = stripped
        }
        return t.replace(whitespace, " ").lowercase()
    }

    private fun normalizeAuthor(raw: String): String {
        val firstPerson = raw.substringBefore(",").trim()
        return roleAnnotation.replace(firstPerson, "").trim().replace(whitespace, " ").lowercase()
    }
}
