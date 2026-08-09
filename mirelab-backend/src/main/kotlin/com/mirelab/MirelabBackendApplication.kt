package com.mirelab

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class MirelabBackendApplication

fun main(args: Array<String>) {
    runApplication<MirelabBackendApplication>(*args)
}
