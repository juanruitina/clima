# Clima.pro (nombre provisional 😜)

Habitualmente el clima de un lugar se representa con las medias de los últimos 30 años. Sin embargo, el cambio climático hace que estas medias no reflejen la tendencia al alza de las temperaturas. Clima.pro hace estimaciones del clima actual en España mediante regresión lineal, calculada a partir de los últimos 30 años.

El calientamiento global no es lineal, por lo que las proyecciones pueden no ser precisas.

## Procesar datos

```
npm install
npm run process
```

## Obtener API key

Clima.pro utiliza la API de la AEMET, la Agencia Estatal de Meteorología de España. [Obtener clave de la API](https://opendata.aemet.es/centrodedescargas/altaUsuario)

```
export API_KEY_AEMET=[API key facilitada por AEMET]
```

# Ejemplo

Madrid Retiro: 3195
No existe: Ourense 1690B