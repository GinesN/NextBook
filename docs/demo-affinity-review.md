# Revisión de la demo · 4 de octubre de 2026

La demo enlazada desde la landing usa `app/data/books.json`: 250 obras, independientes del inventario de las librerías y de Supabase. Se conservan sus títulos, autores y precios de prueba. No se presenta esta selección como un ranking de ventas verificado.

## Catálogo

Antes había 216 registros con el mismo género literario y solo seis combinaciones de temas, determinadas por género. Las 250 descripciones repetían una plantilla en inglés. Se sustituyen por resúmenes originales en español y 250 combinaciones temáticas individuales, con 116 temas distintos. Se incorporan géneros secundarios para obras híbridas y 12 géneros principales: clásica, contemporánea, romance, histórica, aventuras, misterio, ciencia ficción, fantasía, terror, juvenil, ensayo y memorias.

Se corrigen errores como `1984` clasificado únicamente como clásico, `Verity` como romance y ensayos filosóficos o testimonios como autoayuda. Los títulos conservan el idioma del listado original. `The Lovely War` se corrige a `Lovely War`.

Los resúmenes y etiquetas son orientaciones editoriales, no sinopsis oficiales copiadas ni una revisión externa certificada. Ritmo y dificultad se valoran por obra, con especial atención a la experimentación narrativa y la abstracción. Las edades mínimas proceden del catálogo inicial y siguen siendo orientativas. No se inventan ISBN, páginas, traducciones, ediciones ni portadas verificadas.

Se contrastaron casos menos seguros con las fichas editoriales de [The Last Man](https://www.penguinrandomhouse.com/books/730460/the-last-man-by-mary-shelley-introduction-by-john-havard-foreword-by-rebecca-solnit/), [The Bonesetter's Daughter](https://www.penguinrandomhouse.com/books/176371/the-bonesetters-daughter-by-amy-tan/), [The Little Friend](https://www.penguinrandomhouse.com/books/176616/the-little-friend-by-donna-tartt/), [The Moor's Last Sigh](https://www.penguinrandomhouse.com/books/158944/the-moors-last-sigh-by-salman-rushdie/), [Lovely War](https://www.penguinteen.com/9780698157484/lovely-war/), [The Glass Bead Game](https://www.penguin.com.au/books/the-glass-bead-game-9781529918243) y [The Garden of Eden](https://www.simonandschuster.com/books/The-Garden-of-Eden/Ernest-Hemingway/9780684804521). Esto no significa que se haya comprobado cada ficha del catálogo con una editorial.

## Preguntas

Las respuestas de una opción avanzan con un clic. Edad, presupuesto, dificultad y elección de hasta tres temas conservan el botón para confirmar. La interfaz mantiene visible la pregunta y enfoca su título al avanzar, sin volver a la introducción.

Edad determina qué géneros se pueden ofrecer; género determina los temas respaldados por ese catálogo. La pregunta de detalle combina todos los temas elegidos, sin depender del orden de selección. Se omite al elegir descubrir sin preferencias temáticas, y las preguntas de ritmo y dificultad se omiten si la franja de edad no contiene variación. Cambiar destinatario elimina una intención incompatible; cambiar género o edad revisa las preferencias dependientes. La vuelta atrás utiliza la secuencia real de preguntas.

Esta selección no tiene registros por debajo de 13 años. El control lo indica y empieza en 13, en lugar de permitir una edad infantil que acababa sin resultados. No se rebaja la edad de novelas adultas para rellenar esa ausencia. Los precios se identifican como simulados en el presupuesto y en los resultados.

## Afinidad

Se elimina el mínimo artificial de 48% y el peso de la popularidad, precio barato y valoración para regalos, que eran valores simulados. Se usa coincidencia parcial con criterios explícitos:

| Preferencia | Peso | Criterio |
| --- | ---: | --- |
| Temas | 28 | Promedio de los intereses elegidos. Dos etiquetas relacionadas dan coincidencia completa; una etiqueta central, 0,85; una secundaria, 0,55. La centralidad usa los dos primeros temas editoriales de cada ficha. |
| Perspectiva concreta | 12 | Coincidencia parcial con los matices de la respuesta adaptativa. |
| Género | 22 | Principal 1; secundario 0,85; familia cercana 0,25. |
| Intención | 8 | Coincidencia parcial con temas y tono. |
| Sensación | 12 | Tono de la obra. |
| Ritmo | 10 | Distancia entre pausado, equilibrado y ágil. |
| Dificultad | 18 | Distancia de esfuerzo, penalizando más superar el nivel solicitado. |

Solo se cuentan preferencias concretas. «Sorpréndeme», «sin preferencia» y sus equivalentes no añaden coincidencia. La fórmula `(puntos obtenidos + 6) / (pesos activos + 12) × 100` reserva evidencia neutral para evitar certeza con pocas respuestas. Si todo se deja abierto no aparece porcentaje. Es un índice de ajuste a etiquetas editoriales, no una probabilidad validada de satisfacción; algunas señales están relacionadas y no se supone independencia estadística entre ellas.

Edad, disponibilidad de demo y presupuesto son restricciones. Los demás criterios orientan el orden, permitiendo alternativas cuando un género o tema tiene pocos títulos. Siempre se devuelven tres obras distintas si hay al menos tres que cumplen las restricciones. Se favorecen autores distintos y títulos aún no vistos únicamente a cinco puntos de la mejor opción disponible; el historial de hasta 60 IDs vive en memoria durante la sesión y no modifica ningún porcentaje. «Ver otra selección» aparece solo si hay candidatos diferentes dentro de ese margen.

Los resultados y sus fichas muestran información sobre la obra en español. El porcentaje aparece únicamente como cifra en la tarjeta, sin explicar el cálculo dentro de la ficha.

## Verificación

`node --experimental-strip-types --test tests/*.test.mjs` comprueba catálogo, restricciones, preferencias abiertas, señales, respuestas dependientes, adaptación y variedad, además de las pruebas existentes de Carlin.

`node --experimental-strip-types scripts/audit-demo-affinity.mjs` evalúa 5.328 perfiles: 15.768 recomendaciones, 1.064 selecciones diferentes y 212 obras utilizadas. Se obtienen 71 porcentajes distintos, entre 18 y 95. En 72 perfiles no hay tres libros elegibles por edad/presupuesto; se informa de ello y no se eluden los límites. Los resultados reproducibles están en `docs/demo-affinity-audit.json`.

Estas simulaciones verifican reglas y cobertura, no precisión frente a lectores reales. El siguiente paso para calibrar pesos sería disponer de selecciones evaluadas por lectores o personal de librería; no hay datos de satisfacción reales en esta demo.
