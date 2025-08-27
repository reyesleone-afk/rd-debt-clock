# rd-debt-clock

Pagina web interactiva que visualiza indicadores economicos clave de la Republica Dominicana, inspirada en el US Debt Clock.

Los datos se obtienen mediante las APIs publicas de la [Superintendencia de Bancos de la República Dominicana](https://sb.gob.do/), integradas mediante llamadas a `https://apis.sb.gob.do/`.

## Publicación

El repositorio incluye un flujo de GitHub Actions que publica automaticamente el contenido de la rama `main` en GitHub Pages. Cada vez que se hace un push a `main`, el workflow construye los archivos estaticos y los despliega.

## Configuración de la API

El archivo `index.html` contiene una llamada a la API publica de la Superintendencia de Bancos (`https://apis.sb.gob.do/`). Para que la pagina muestre datos reales, debe reemplazar la constante `API_KEY` con una clave valida proporcionada por la SB.
