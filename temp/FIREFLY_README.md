# Adobe Firefly API – gerar imagens e complementar a pasta temp

Este script usa a **API do Adobe Firefly** para gerar imagens por texto (prompt) e salvar na pasta `temp`, complementando o que você já tem (por exemplo `EFEITOS_REFERENCIAS.md` e outras referências).

## O que você precisa

1. **Conta Adobe** e acesso ao [Adobe Developer Console](https://developer.adobe.com/console).
2. **Projeto** com o serviço **Firefly Services API** (ou Firefly API) ativo.
3. **Credenciais**: Client ID e Client Secret do projeto.

### Como obter Client ID e Client Secret

1. Acesse [Adobe Developer Console](https://developer.adobe.com/console).
2. Crie um projeto ou abra um existente.
3. Adicione a API **Firefly Services** (ou Firefly API) ao projeto.
4. Em **Credentials** (ou no serviço), copie o **Client ID** e o **Client Secret**.

## Configuração

Na pasta `temp`, crie um arquivo `.env` (não versionado) com:

```env
FIREFLY_SERVICES_CLIENT_ID=seu_client_id_aqui
FIREFLY_SERVICES_CLIENT_SECRET=seu_client_secret_aqui
```

Ou exporte as variáveis no terminal antes de rodar o script.

## Instalação e uso

```bash
cd temp
pip install -r requirements-firefly.txt
python firefly_generate.py
```

- **Sem argumentos**: gera as imagens padrão da landing (hero, soundbar, instalação, cabos) e salva em `temp`.
- **Com prompt customizado**:  
  `python firefly_generate.py "sua descrição da imagem em inglês"`  
  Gera uma imagem e salva como `firefly-custom.jpg` em `temp`.

O script lista as imagens já existentes em `temp` e adiciona as novas, sem apagar nada.

## Endpoints usados

- **Token**: `https://ims-na1.adobelogin.com/ims/token/v3`
- **Geração**: `https://firefly-api.adobe.io/v3/images/generate-async` (assíncrono; o script faz poll do status até concluir e depois baixa a imagem).

## Referências

- [Firefly API – Quickstart](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/)
- [Generate Image API Tutorial](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/firefly-generate-image-api-tutorial)
- [Using the Async API](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/using-async-apis/)
