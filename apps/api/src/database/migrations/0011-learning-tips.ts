import type { Migration } from "../migration-runner.js";

export const learningTipsMigration: Migration = {
  id: "0011_learning_tips",
  statements: [
    `create table learning_tips (id text primary key, sort_order integer not null)`,
    `create table learning_tip_translations (
        tip_id text not null references learning_tips(id) on delete cascade,
        locale text not null check (char_length(btrim(locale)) > 0),
        title text not null check (char_length(title) between 1 and 120 and char_length(btrim(title)) > 0),
        text text not null check (char_length(text) between 1 and 2000 and char_length(btrim(text)) > 0),
        primary key (tip_id, locale)
      )`,
    `insert into learning_tips (id, sort_order) values
        ('reading-by-lines', 0),
        ('learning-through-meaning', 1),
        ('when-recall-stalls', 2)`,
    `insert into learning_tip_translations (tip_id, locale, title, text) values
        ('reading-by-lines', 'ru', 'Как читать шлоку по строкам', 'Читайте каждую строку как отдельную смысловую фразу. Сначала произнесите ее медленно, затем соедините со следующей строкой и повторите весь фрагмент без паузы.'),
        ('learning-through-meaning', 'ru', 'Как читать шлоку по строкам', 'Разберите ключевые слова и свяжите их с общим смыслом строки. Вспоминайте не только звучание, но и последовательность образов или действий, которую передает текст.'),
        ('when-recall-stalls', 'ru', 'Как читать шлоку по строкам', 'Не пытайтесь угадать весь текст сразу. Вспомните первое слово или смысл строки, прочитайте подсказку и затем повторите шлоку целиком еще раз.')`,
  ],
};
