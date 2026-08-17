package com.mirelab.application.book

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class BookSearchController(private val bookSearchService: BookSearchService) {

    @GetMapping("/api/books/search")
    fun search(@RequestParam query: String): List<BookSearchResponse> = bookSearchService.search(query)
}
