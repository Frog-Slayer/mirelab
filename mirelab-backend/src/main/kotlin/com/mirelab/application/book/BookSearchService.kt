package com.mirelab.application.book

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder
import tools.jackson.databind.ObjectMapper
import java.util.concurrent.CompletableFuture

/**
 * 알라딘 Open API(TTB) 프록시. 프론트가 TTBKey 를 직접 들고 있지 않도록,
 * 그리고 도서 검색 호출량(하루 5천 건)을 백엔드에서 한 곳으로 모으기 위해 거친다.
 */
@Service
class BookSearchService(
    @Value("\${aladin.ttb-key}") private val ttbKey: String,
    private val objectMapper: ObjectMapper,
) {
    private val restClient = RestClient.create()

    fun search(query: String): List<BookSearchResponse> {
        check(ttbKey.isNotBlank()) { "ALADIN_TTB_KEY 가 설정되지 않았습니다" }

        // SearchTarget 은 호출당 하나만 지정 가능하다. ALL 은 음반/DVD/중고까지 섞여 나오므로
        // 국내도서/외국도서/전자책만 병렬로 조회해 합친다.
        val items = SEARCH_TARGETS
            .map { target -> CompletableFuture.supplyAsync { searchByTarget(query, target) } }
            .flatMap { it.join() }

        return items
            .distinctBy { it.isbn13.ifBlank { "${it.title}|${it.author}|${it.publisher}" } }
            .take(20)
    }

    private fun searchByTarget(query: String, searchTarget: String): List<BookSearchResponse> {
        val uri = UriComponentsBuilder.fromUriString("https://www.aladin.co.kr/ttb/api/ItemSearch.aspx")
            .queryParam("ttbkey", ttbKey)
            .queryParam("Query", query)
            .queryParam("QueryType", "Keyword")
            .queryParam("SearchTarget", searchTarget)
            .queryParam("MaxResults", 20)
            .queryParam("Cover", "Big")
            .queryParam("output", "js")
            .queryParam("Version", "20131101")
            .build()
            .toUri()

        val body = restClient.get().uri(uri).retrieve().body(String::class.java) ?: return emptyList()
        return objectMapper.readValue(body, AladinSearchResponse::class.java).item.map { it.toResponse() }
    }

    companion object {
        private val SEARCH_TARGETS = listOf("Book", "Foreign", "eBook")
    }
}
