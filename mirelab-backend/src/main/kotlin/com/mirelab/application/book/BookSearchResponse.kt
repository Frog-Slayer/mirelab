package com.mirelab.application.book

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

data class BookSearchResponse(
    val title: String,
    val author: String,
    val publisher: String,
    val pubDate: String,
    val isbn13: String,
    val cover: String,
    val description: String,
)

/** 알라딘 검색/조회 API 원본 응답. 필요한 필드만 뽑고 나머지는 무시한다 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class AladinSearchResponse(
    val item: List<AladinItem> = emptyList(),
    val errorCode: Int? = null,
    val errorMessage: String? = null,
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class AladinItem(
    val title: String = "",
    val author: String = "",
    val publisher: String = "",
    val pubDate: String = "",
    val isbn13: String = "",
    val cover: String = "",
    val description: String = "",
) {
    fun toResponse() = BookSearchResponse(
        title = title,
        author = author,
        publisher = publisher,
        pubDate = pubDate,
        isbn13 = isbn13,
        cover = cover,
        description = description,
    )
}
