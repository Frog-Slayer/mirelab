package com.mirelab.domain.slot

import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter
import tools.jackson.core.type.TypeReference
import tools.jackson.databind.ObjectMapper

/**
 * Hibernate 의 네이티브 JSON 타입 매핑(`@JdbcTypeCode(SqlTypes.JSON)`)이 H2 에서
 * 이중 인코딩되어 깨져서, 그냥 문자열 컬럼에 직접 JSON을 넣고 빼는 컨버터로 대체한다.
 * Postgres 에서도 그대로 text/varchar 로 저장된다 — jsonb 네이티브 질의는 지금 안 쓴다.
 */
@Converter
class SlotValueJsonConverter : AttributeConverter<Map<String, Any?>, String> {
    private val mapper = ObjectMapper()
    private val typeRef = object : TypeReference<Map<String, Any?>>() {}

    override fun convertToDatabaseColumn(attribute: Map<String, Any?>?): String? =
        attribute?.let { mapper.writeValueAsString(it) }

    override fun convertToEntityAttribute(dbData: String?): Map<String, Any?>? =
        dbData?.let { mapper.readValue(it, typeRef) }
}
