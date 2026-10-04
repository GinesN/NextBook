# Revisión del cuestionario y la afinidad · 4 de octubre de 2026

## Qué catálogo se evalúa

La consulta de solo lectura en Supabase confirmó 3.961 fichas en el inventario, 500 activas y 500 enriquecidas. El recomendador carga esas 500, con sinopsis en español, autor y portada, y aplica edad, stock positivo, precio conocido y presupuesto antes de puntuar. No consulta los 3.461 títulos desactivados para completar resultados.

En la copia privada auditada, las 500 fichas también tienen páginas y editorial. Hay 20 géneros y 193 autores. Para una persona adulta hay 306 títulos elegibles; con un presupuesto de 20 € quedan 263. Como ejemplos de otras edades: 5 años, 64 títulos; 8 años, 84; 12 años, 106; 16 años, 92. Estas cifras se solapan entre franjas y no deben sumarse.

La cobertura está desequilibrada: romance tiene 80 títulos, thriller 72 y fantasía 68, mientras que cocina, filosofía y divulgación científica tienen uno cada una. Ninguna fórmula puede crear tres coincidencias fuertes en un género con un solo libro. Las alternativas de otros géneros conservan una puntuación menor cuando coinciden menos con las respuestas. El stock y los precios proceden del archivo importado; no están sincronizados con las ventas posteriores.

## Problemas encontrados

El cálculo anterior solo sumaba coincidencias binarias: género o tipo, tema, ritmo y dificultad. Con género y tema como únicas preferencias concretas, acertar ambos producía 100 % y acertar uno 50 %. Era una proporción de etiquetas, no una predicción de satisfacción.

Las preguntas de ritmo y nivel se calculaban después de restringir por tema. Un tema con un solo título las eliminaba, aunque podían ayudar a escoger las otras dos recomendaciones. Además, el ritmo se había asignado principalmente por género y la dificultad por género, edad y páginas: ambos tienen menos independencia y fiabilidad que un dato bibliográfico comprobado.

La selección priorizaba grupos de género/tema y novedades antes de considerar todas las preferencias conjuntamente. Por eso una alternativa que respondía mejor al nivel o extensión podía quedar relegada. La deduplicación también eliminaba los números de los títulos y podía confundir distintos volúmenes de una saga.

## Cálculo revisado

Es un recomendador basado en contenido, con reglas editoriales explícitas. Usa datos existentes del libro y preferencias expresadas. La referencia conceptual es el [filtrado basado en contenido de Google](https://developers.google.com/machine-learning/recommendation/content-based/basics); los pesos y reglas de este proyecto son decisiones propias, no un modelo entrenado por Google.

| Señal | Peso máximo | Cómo se compara |
| --- | ---: | --- |
| Camino de lectura y género | 30 | Coincidencia exacta, género del mismo camino o familia próxima. Si se concretan ambos, se reparten 12 y 18; no se cuentan como dos preferencias independientes de peso completo. |
| Tema | 30 | Etiqueta, evidencia léxica en la sinopsis, materias bibliográficas y temas relacionados. Una etiqueta aislada tiene menos fuerza que un tema respaldado por el contenido. |
| Ritmo | 12 | Distancia entre pausado, equilibrado y ágil; admite los nombres anteriores rápido/lento. |
| Nivel | 16 | Distancia entre muy fácil, fácil, medio y alto; penaliza más un libro más exigente de lo pedido. |
| Extensión | 12 | Páginas reales: hasta 240, 241–480 o más de 480, con coincidencia parcial si se aproxima al intervalo elegido. |

Solo se usan los pesos de preferencias concretadas. «Sorpréndeme» deja abierto ese criterio y no añade coincidencia. Si todas las preferencias están abiertas no se inventa un porcentaje.

El cálculo aplica una regularización conservadora: `(suma de peso × coincidencia + 6) / (suma de pesos + 12) × 100`. Es una reserva neutral de información desconocida: una sola respuesta no implica certeza absoluta. No se limita el resultado a un número decorativo, no se ordena por un percentil del catálogo y no cambia el porcentaje según el azar o el historial. Tampoco es una probabilidad calibrada de que al lector le guste el libro. Con más preferencias coherentes hay más evidencia; las contradicciones bajan el resultado.

Edad, presupuesto, precio conocido y stock son restricciones obligatorias. No inflan la afinidad por sí solos. Autor, portada, editorial, precio bajo y número de ejemplares no implican que un libro guste más; tampoco se usan como preferencias sin una respuesta del lector. El tono existente no añade otro peso porque su clasificación es orientativa y está muy ligada al género. La calidad del registro solo ayuda a desempatar; no aumenta el porcentaje.

Los candidatos se ordenan por todas las señales juntas. La variedad se permite a cinco puntos de la mejor opción disponible, con un margen de un punto para desempatar. Se evitan distintas ediciones de la misma obra y se conservan los números de las sagas. La opción de ver otras recomendaciones solo se ofrece si existen alternativas cercanas a la selección actual.

## Cuestionario revisado

Conserva la selección automática al pulsar una respuesta y la estética existente. Las opciones de lectura, género y tema siguen adaptándose a la edad y al catálogo. Ritmo y nivel usan los libros elegibles por edad, para que un tema minoritario no suprima preguntas relevantes para las alternativas. Se pregunta el ritmo cuando el camino permite ficción y hay diversidad de ritmos; el nivel cuando hay diversidad de niveles.

Se añade extensión cuando existen al menos dos intervalos de páginas disponibles. Las opciones de presupuesto consideran los libros disponibles para esa edad y no obligan a gastar más por haber elegido un tema raro. Un género implícito en un camino no se cuenta como una segunda elección del usuario. El flujo auditado tiene entre siete y nueve preguntas; las que no aportan una elección real se omiten.

La afinidad sigue apareciendo solo como porcentaje en la tarjeta. No se han recuperado explicaciones de la fórmula en la cabecera ni en la ficha del libro.

## Validación y límites

El informe [carlin-affinity-audit.json](./carlin-affinity-audit.json) compara ambos cálculos con 904 perfiles sintéticos sobre los mismos 500 registros: distintas edades, caminos, temas comunes y minoritarios, niveles, ritmos, extensiones y presupuestos. Todos devolvieron tres obras distintas dentro del presupuesto. De 2.712 recomendaciones, el cálculo anterior produjo 12 porcentajes distintos, incluidos 719 resultados de 100 % y 225 de 50 %. El revisado produjo 54 porcentajes distintos, entre 38 % y 95 %, con ocho resultados de 50 % y ninguno de 100 %. Los porcentajes pueden repetirse si los libros tienen características equivalentes; no se introduce variación artificial.

Estas pruebas demuestran consistencia, diversidad de puntuaciones y cumplimiento de restricciones. No demuestran un aumento medido de satisfacción ni un porcentaje real de acierto. Hay 34 alternativas por debajo de 50 % en los perfiles auditados, asociadas a preferencias con poca cobertura: no se maquillan para aparentar una recomendación fuerte.

La siguiente mejora de calidad requiere revisión editorial de edad, temas, ritmo y nivel, especialmente en los géneros escasos. La interpretación léxica de una sinopsis puede confundir una mención incidental con un tema; las materias también pueden ser amplias. Un primer conjunto de 30–50 perfiles juzgados por una persona de la librería, con puntuaciones de adecuación de las recomendaciones, permitiría ajustar los pesos y medir el orden con una prueba separada. Más adelante, valoraciones voluntarias de lectores permitirían evaluar satisfacción real. Ninguno de esos datos existe actualmente y esta revisión no recoge ni guarda nuevas respuestas personales.

Para repetir el análisis: `node --experimental-strip-types scripts/audit-carlin-affinity.mjs`. La comparación antes/después requiere la copia privada anterior como segundo argumento. El catálogo completo y esa copia permanecen en `work/`, ignorado por Git; el informe publicado contiene únicamente estadísticas agregadas.
