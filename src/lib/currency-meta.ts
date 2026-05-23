export const CURRENCY_META: Record<string, { code: string; name: string; flag: string }> = {
  USD: { code: "USD", name: "美元", flag: "🇺🇸" },
  CNY: { code: "CNY", name: "人民币", flag: "🇨🇳" },
  EUR: { code: "EUR", name: "欧元", flag: "🇪🇺" },
  GBP: { code: "GBP", name: "英镑", flag: "🇬🇧" },
  JPY: { code: "JPY", name: "日元", flag: "🇯🇵" },
  AUD: { code: "AUD", name: "澳元", flag: "🇦🇺" },
  CAD: { code: "CAD", name: "加元", flag: "🇨🇦" },
  CHF: { code: "CHF", name: "瑞郎", flag: "🇨🇭" },
  HKD: { code: "HKD", name: "港币", flag: "🇭🇰" },
  SGD: { code: "SGD", name: "新元", flag: "🇸🇬" },
  NZD: { code: "NZD", name: "纽元", flag: "🇳🇿" },
  KRW: { code: "KRW", name: "韩元", flag: "🇰🇷" },
  THB: { code: "THB", name: "泰铢", flag: "🇹🇭" },
};

export type CurrencyPair =
  | "USD/CNY" | "EUR/CNY" | "GBP/CNY" | "JPY/CNY"
  | "AUD/CNY" | "CAD/CNY" | "USD/EUR" | "GBP/USD";

export const MAIN_PAIRS: CurrencyPair[] = [
  "USD/CNY", "EUR/CNY", "GBP/CNY", "JPY/CNY", "AUD/CNY", "USD/EUR", "GBP/USD",
];
