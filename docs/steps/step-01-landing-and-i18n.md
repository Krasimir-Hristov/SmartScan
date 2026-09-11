# Стъпка 1: Landing Page & Архитектура на Многоезичността (i18n)

> **Статус**: 🟢 Завършена и слята в `main`  
> **Дата на завършване**: 11 септември 2026 г.  
> **Дизайн референции**: `design/00_master_tokens.md` и `design/05_landing_page.md`

---

## 1. Резюме на Стъпката

В тази първа фаза изградихме началната страница на **SmartScan Stay** според дизайн спецификацията за луксозен краткосрочен наем:
1. **Obsidian High-Tech Luxury визуален стил**: Тъмна премиум естетика (`#09090b` фон, `#121216` карти, смарагдови акценти `#10b981` с нови Tailwind v4 линейни градиенти `bg-linear-to-*`).
2. **Модулни Feature-based компоненти**:
   - `landing-hero.tsx`: Силно първо послание с двойно CTA (`Start Free with Google` и демо за гости).
   - `hero-showcase.tsx`, `plaque-mockup.tsx`, `mobile-mockup.tsx`: Интерактивни визуализации на физическата акрилна табелка и мобилното PWA за гости.
   - `how-it-works.tsx`: Информационна решетка от 3 стъпки (Гласово въвеждане ➔ Печат на табелка ➔ Гост сканира).
   - `features-grid.tsx`: Карти за нулева халюцинация (100% верифицирани данни), свръхбърз SSE стрийминг и спешна ескалация към хазяина по WhatsApp/телефон.
   - `pricing-section.tsx`: Прозрачен ценови модел (€9/месец на обект или €79/година с безплатно сезонно паузиране).
   - `auth-modal.tsx`: Модал за бърз вход с Google OAuth или директно тестване на демото.
3. **100% Типизация и чист билд**: Пълен преход към стрелкови функции (`React.FC`), строго спазване на правилото без `any`, и безпроблемна компилация с Next.js 16 (App Router & Turbopack).

---

## 2. Архитектура на Многоезичността (i18n)

Системата е изградена с библиотеката `next-intl`, но с **персонализирана високопроизводителна архитектура без `middleware.ts`**.

### Защо НЕ използваме `middleware.ts`? (No-Middleware Policy)
- **Сигурност (CVE-2025-29927)**: Защита срещу уязвимости при вътрешни subrequest хедъри в Edge Middleware.
- **Чисти URL адреси**: Вместо тромави адреси с езикови префикси (напр. `/bg/`, `/en/stay/...`), платформата запазва чисти и консистентни URL адреси (`/`, `/stay/[slug]`, `/dashboard`).
- **Светкавична скорост**: Езикът се управлява изцяло на ниво App Router сървърни заявки и бисквитка.

---

### Как работи определянето на езика (Резолюционна йерархия)

Когато потребител отвори приложението, сървърът в [`frontend/src/i18n/request.ts`](file:///d:/myProjects/smart_scan/frontend/src/i18n/request.ts) определя езика по следния стриктен приоритет:

```mermaid
flowchart TD
    A[Потребителят отваря сайта] --> B{Има ли бисквитка NEXT_LOCALE?}
    B -- Да (валиден код) --> C[Използвай езика от бисквитката]
    B -- Не --> D{Има ли Accept-Language хедър от браузъра?}
    D -- Да --> E[Парсирай хедъра по RFC 7231 с тегла q]
    E --> F{Има ли съвпадение с нашите 10 езика?}
    F -- Да --> G[Използвай най-високо оценения поддържан език]
    F -- Не --> H[Върни Fallback език: 'en']
    D -- Не --> H
    C --> I[Зареди съответния messages/{locale}.json]
    G --> I
    H --> I
    I --> J[Рендирай приложението в NextIntlClientProvider]
```

1. **Приоритет 1 (Ръчен избор)**: Проверява се бисквитката `NEXT_LOCALE`. Ако потребителят е кликнал на селектора и е избрал език, неговият избор е с най-висок приоритет.
2. **Приоритет 2 (Автоматично разпознаване от браузъра)**: Ако няма бисквитка, сървърът чете HTTP хедъра `Accept-Language` (напр. `ro-RO,ro;q=0.9,en;q=0.8`). Хедърът се парсира с тегла `q`, филтрират се нежелани езици (`q=0`), и се избира най-предпочитаният език, който съществува в нашата платформа.
3. **Приоритет 3 (Fallback)**: Ако нито един от браузърните езици не се поддържа, системата сервира английски (`en`).

---

## 3. Списък и роля на ключовите i18n файлове

| Файл | Местоположение | Роля и отговорност |
| :--- | :--- | :--- |
| [`config.ts`](file:///d:/myProjects/smart_scan/frontend/src/lib/i18n/config.ts) | `frontend/src/lib/i18n/config.ts` | Дефинира списъка от 10-те поддържани езика (`en`, `bg`, `ro`, `el`, `ru`, `tr`, `de`, `es`, `it`, `fr`), техните имена, местни наименования и SVG код за знамената (`flag-icons`). |
| [`request.ts`](file:///d:/myProjects/smart_scan/frontend/src/i18n/request.ts) | `frontend/src/i18n/request.ts` | Сървърна функция `getRequestConfig()`. Извиква се автоматично от Next.js на всяка заявка. Чете бисквитката/хедърите и динамично импортира съответния JSON файл. |
| [`actions.ts`](file:///d:/myProjects/smart_scan/frontend/src/features/i18n/actions.ts) | `frontend/src/features/i18n/actions.ts` | Next.js Server Action (`setLocaleAction`). Извиква се при клик върху език от селектора. Записва бисквитката `NEXT_LOCALE` с валидност 1 година (`maxAge: 31536000`). |
| [`layout.tsx`](file:///d:/myProjects/smart_scan/frontend/src/app/layout.tsx) | `frontend/src/app/layout.tsx` | Входна точка. Извиква `await getLocale()` и `await getMessages()` и обвива децата в `<NextIntlClientProvider>`, за да осигури достъп до преводите за всички клиентски и сървърни компоненти. |
| [`language-switcher.tsx`](file:///d:/myProjects/smart_scan/frontend/src/components/ui/language-switcher.tsx) | `frontend/src/components/ui/language-switcher.tsx` | UI компонент за смяна на езика. Поддържа падащо меню с търсачка, разпознаване на флагче и десктоп/мобилен адаптивен изглед. |
| `messages/{locale}.json` | `frontend/messages/*.json` | 10 JSON файла с преведените текстове. Всички 10 файла имат **100% идентична структура на ключовете**. |

---

## 4. Как се добавят нови текстове в бъдеще (Наръчник)

Ако след време добавяш нов компонент, бутон или секция, следвай тези 3 прости стъпки, за да избегнеш грешки:

### Стъпка 1: Добави ключа в английския файл ([`en.json`](file:///d:/myProjects/smart_scan/frontend/messages/en.json))
Отвори `frontend/messages/en.json` и намери съответната секция (или създай нова):
```json
"demo": {
  "demoBadge": "DEMO PROPERTY",
  "newFeatureTitle": "Exciting New Feature"
}
```

### Стъпка 2: Добави същия ключ във ВСИЧКИ останали 9 файла
Задължително добави същия ключ в:
- `bg.json` (Български)
- `ro.json` (Румънски)
- `el.json` (Гръцки)
- `de.json` (Немски)
- `fr.json` (Френски)
- `es.json` (Испански)
- `it.json` (Италиански)
- `ru.json` (Руски)
- `tr.json` (Турски)

> [!WARNING]
> Ако пропуснеш дори един файл, `next-intl` ще хвърли грешка в конзолата: `MISSING_MESSAGE: Could not resolve ... in messages for locale ...`.

### Стъпка 3: Използвай превода в React компонента
В твоя компонент:
```tsx
import { useTranslations } from 'next-intl';

export const MyComponent: React.FC = () => {
  const t = useTranslations('demo');

  return (
    <div>
      <span>{t('demoBadge')}</span>
      <h2>{t('newFeatureTitle')}</h2>
    </div>
  );
};
```

---

## 5. Проверка за консистентност на преводите (Script)

За да си сигурен, че няма липсващ ключ в нито един език, можеш винаги да изпълниш тази бърза команда в терминала:

```powershell
node -e "const fs = require('fs'); function getKeys(obj, p='') { let res = []; for(let k in obj) { let np = p ? p+'.'+k : k; if(typeof obj[k]==='object' && obj[k]!==null) res = res.concat(getKeys(obj[k], np)); else res.push(np); } return res; } const en = new Set(getKeys(JSON.parse(fs.readFileSync('frontend/messages/en.json')))); ['bg','de','el','es','fr','it','ro','ru','tr'].forEach(l => { const loc = new Set(getKeys(JSON.parse(fs.readFileSync('frontend/messages/'+l+'.json')))); const diff = [...en].filter(x => !loc.has(x)); console.log(l, 'missing:', diff.length); });"
```

Ако изведе `missing: 0` за всички езици — преводите са перфектни!
