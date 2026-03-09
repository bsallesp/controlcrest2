# TV Mounting Boca Raton — Angular

Versão Angular da landing page (mesmo conteúdo e fluxo da pasta `LandingPage`).

## Desenvolvimento

1. **Configurar chave e telefone**  
   Edite `src/environments/environment.development.ts` (e `environment.ts` para produção):
   - `googleApiKey`: sua chave da API do Google (Places + Geocoding)
   - `phone`: número de contato

2. **Instalar e rodar**
   ```bash
   npm install
   npm start
   ```
   Abra http://localhost:4200

## Build de produção

```bash
npm run build
```
Saída em `dist/landing-page-ng/`.

## Estrutura

- **AppComponent**: hero, serviços, benefícios, galeria, formulário de contato
- **GoogleMapsService**: carrega o script do Google Maps, autocomplete de endereço e reverse geocode (com fallback Nominatim)
- **Estilos**: variáveis CSS e layout equivalentes à landing em HTML estático
