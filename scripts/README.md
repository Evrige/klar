# Справочная разметка уровней

Эти скрипты не запускаются при сборке сайта и не нужны для Vercel.

1. `read-wordlists.py` скачивает официальные PDF Goethe и извлекает текст через `pypdf` в игнорируемую папку `.reference-cache/`.
2. `node --experimental-strip-types scripts/classify-vocabulary.mjs` сопоставляет имеющиеся 2000 карточек с заголовочными словами и записывает только метки уровней в `src/data/vocabularyLevels.json`.

Источники:

- [Goethe A1 Start Deutsch 1](https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf)
- [Goethe A2](https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf)
- [Goethe B1](https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf)

Автоматическое извлечение колонок PDF неполно: склонённые формы, словосочетания и тематические группы могут не совпасть с заголовком. Метки служат ориентиром для тренировки, а не сертификацией значения слова. Неразмеченные карточки остаются дополнительной лексикой. Редакционные метки базовых выражений отдельно заданы в `src/data/wordLevels.ts`. При обновлении справочников результат нужно проверить перед заменой текущей разметки.

Исходные предложения и объяснения из PDF не публикуются в приложении.
