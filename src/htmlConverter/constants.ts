export const SYMBOLS = {
  ONE_BR: "§",
} as const;
export const STORAGE_PROVIDERS_CONFIG = {
  providers: {
    finance: {
      publicBaseUrl: "https://storage.5th-elementagency.com/",
      signatureImageSrc: "sign_url",
    },
    alphaone: {
      publicBaseUrl: "https://alphaonest.com/files/promo",
      signatureImageSrc: "https://alphaonest.com/",
    },
    ttt: {
      publicBaseUrl: "https://ogfinstorage.com/files/creatives",
      signatureImageSrc: "https://ogfinstorage.com/",
    },
    red: {
      publicBaseUrl: "https://reagstr.com/files/promo",
      signatureImageSrc: "https://reagstr.com/",
    },
  },
} as const;
