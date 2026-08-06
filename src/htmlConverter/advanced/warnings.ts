// Centralized non-fatal conversion warning messages (surfaced in the UI log).
// Kept in one place so wording/typos live in a single spot and duplicated call
// sites (e.g. nested-table flattening) can't drift apart.

export const WARN = {
  imageWithoutSrc: "Зображення без src пропущено",
  nestedTableFlattened:
    "Вкладену таблицю сплющено до тексту (розмітка внутрішньої таблиці втрачена)",
  tablesMergedMismatch:
    "Сусідні таблиці об'єднано в одну, але колір рамки або ширини колонок другої таблиці відрізняються — застосовано значення першої",
  imageDroppedInCell:
    "Зображення в клітинці таблиці втрачено — цей тип блоку (розділювач/сітка статистики) не підтримує зображення всередині",
  sideImageMarkerUnclosed:
    "Маркер i-r-s/i-l-s без пари (не знайдено відповідного закриваючого маркера) — проігноровано",
  sideImageMixedContent:
    "Обгортка i-r-s/i-l-s містить непідтримуваний вміст (заголовок/зображення/таблицю) — текст не огортає зображення",
} as const;
