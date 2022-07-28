# Clima.pro (nombre provisional 😜)

Habitualmente el clima de un lugar se representa con las medias de los últimos 30 años, y se visualiza en un gráfico llamado [climograma](https://es.wikipedia.org/wiki/Climograma). Sin embargo, las medias parecen no reflejar la tendencia al alza de las temperaturas debida al cambio climático. Clima.pro hace estimaciones del clima actual en España mediante regresión lineal, calculada a partir de los últimos 30 años.

Ten en cuenta que el calientamiento global no es un proceso lineal, por lo que las proyecciones pueden no ser precisas.

## Procesar datos

Para poder obtener y procesar los datos climatológicos, asegúrate de instalar primero todas las dependencias: `npm install`

- `npm start`: obtiene y procesa los datos y guarda solo los estrictamente necesarios en `/data`.
- `npm run cache`: obtiene y procesa los datos y guarda todos los archivos, incluido la respuesta tal cual es facilitada por la AEMET. Ten en cuenta que la respuesta puede pesar más de 50 MB.

Para desplegar el proyecto en un proveedor de sitios estáticos como Cloudflare Pages, Netlify o Vercel, configúralo para que ejecute simplemente `npm start`.

## API de AEMET

Clima.pro utiliza la [API de la AEMET](https://opendata.aemet.es/centrodedescargas/inicio), la Agencia Estatal de Meteorología de España, para obtener los datos de cada estación meteorológica y los datos mensuales con los que se calcula la tendencia.

Puedes [obtener la clave de la API](https://opendata.aemet.es/centrodedescargas/altaUsuario) de forma gratuita.

Si estás ejecutando la aplicación en local o tienes acceso SSH a tu servidor, deberás añadir la clave a través del terminal con el siguiente comando:

```
export API_KEY_AEMET=[API key facilitada por AEMET]
```