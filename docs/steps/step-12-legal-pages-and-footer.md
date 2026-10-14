# Стъпка 12: Footer Интеграция & Legal Pages (GDPR, Stripe, /terms & /privacy)

> **Статус**: 🟢 Завършена и слята в `main` (PR #16)  
> **Дата на завършване**: 8 октомври 2026 г.  
> **Нормативна рамка**: Регламент (ЕС) 2016/679 (GDPR), Директива 2002/58/ЕО (ePrivacy Directive), Stripe Services Agreement.  
> **Референтни документи**: [`ROADMAP.md`](../../ROADMAP.md), [`AGENTS.md`](../../AGENTS.md), [`docs/README.md`](../README.md).

---

## 1. Резюме на Стъпката

В тази стъпка изградихме правната и нормативна инфраструктура на **SmartScan Stay**, необходима за официалното приемане на плащания чрез Stripe в Европейския съюз и спазването на стриктните изисквания на GDPR:

1. **Правно издържани страници за Общи условия и Поверителност**:
   - `/terms` ([`TermsPage.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/legal/TermsPage.tsx)) — 11 подробни клаузи, уреждащи SaaS абонаментите на хазяите, пробния период (14 дни без кредитна карта), сезонния паузинг, оперативните отговорности на AI консиержа и българската/европейска правна юрисдикция.
   - `/privacy` ([`PrivacyPage.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/legal/PrivacyPage.tsx)) — 10 GDPR клаузи с изчерпателно разграничение между Данни на хазяина (*Host Data*) и Ефимерни взаимодействия на гостите (*Guest Data*), право на изтриване (*Right to be Forgotten*), ЕС сървъри във Франкфурт и координати на DPO.
2. **Главен футър на Landing страницата ([`LandingFooter.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/landing/components/LandingFooter.tsx))**:
   - Свързани реални Next.js маршрути с активно състояние (`/terms`, `/privacy`, `/cookies`, `/contact`).
   - Интелигентна резолюция на котвени препратки (`/#overview`, `/#how-it-works`, `/#pricing`) при връщане от подстраници към началната секция.
   - 10 интерактивни SVG знамена (`flag-icons`) с незабавна смяна на езика и запаметяване в бисквитка (`NEXT_LOCALE`).
   - Официални доверени баджове: **Stripe Verified Partner** и **GDPR Compliant (EU Host)**.
3. **Пълен 10-езиков паритет (`next-intl`)**:
   - Всички нормативни текстове, заглавия, параграфи, списъци и предупредителни карета са преведени професионално на 10-те основни европейски туристически пазара:
     🇬🇧 `en`, 🇧🇬 `bg`, 🇩🇪 `de`, 🇷🇴 `ro`, 🇬🇷 `el`, 🇷🇺 `ru`, 🇹🇷 `tr`, 🇪🇸 `es`, 🇮🇹 `it`, 🇫🇷 `fr`.
   - Динамични SEO метаданни (`generateMetadata`) с преведени заглавия и описания за всяка езикова версия.

---

## 2. Архитектура на модул `src/features/legal/`

Съгласно **Feature-Based Architecture** стандартите в [`AGENTS.md`](../../AGENTS.md), цялата правна логика е капсулирана в самостоятелен модул:

```text
frontend/src/
├── app/
│   ├── terms/
│   │   └── page.tsx           # Асинхронен Server Component: generateMetadata() + <TermsPage />
│   └── privacy/
│       └── page.tsx           # Асинхронен Server Component: generateMetadata() + <PrivacyPage />
│
└── features/legal/
    ├── TermsPage.tsx          # Клиентски изглед за Общите условия
    ├── PrivacyPage.tsx        # Клиентски изглед за Политиката за поверителност
    ├── components/
    │   ├── LegalNavbar.tsx    # Sticky хедър с табове (Terms / Privacy / Cookies), лого и LanguageSwitcher
    │   ├── LegalHeader.tsx    # Заглавие, бадж, дата на последна редакция и window.print() бутон
    │   ├── LegalTableOfContents.tsx # Плаващо меню със Scrollspy проследяване на секциите
    │   └── LegalSectionCard.tsx # Луксозна карта за клауза с подточки и акцентни карета
    ├── content/
    │   ├── termsContent.ts    # Чист строител на клаузите на Общите условия (buildTermsDocument)
    │   └── privacyContent.ts  # Чист строител на клаузите на Поверителността (buildPrivacyDocument)
    ├── types/
    │   └── legalTypes.ts      # Стриктни интерфейси (LegalDocument, LegalSection, LegalClause)
    └── index.ts               # Barrel Export на публичния интерфейс
```

---

## 3. Ключови компоненти и функционалности

### 3.1. Разделение на съдържанието и интернационализация (Pure Builders)
Всички клаузи са изнесени от UI компонентите в чисти функции строители ([`termsContent.ts`](file:///d:/myProjects/smart_scan/frontend/src/features/legal/content/termsContent.ts) и [`privacyContent.ts`](file:///d:/myProjects/smart_scan/frontend/src/features/legal/content/privacyContent.ts)). Те приемат `t: (key: string) => string` от `next-intl` и генерират строго типизирана структура без дублиране на JSX:

```typescript
export function buildTermsDocument(t: (key: string) => string): LegalDocument {
  return {
    id: 'terms-of-service',
    title: t('c1Title'),
    sections: [
      {
        id: 'acceptance',
        number: '01',
        title: t('c1Title'),
        paragraphs: [t('c1P1'), t('c1P2')],
      },
      // ... клаузи 02 до 11
    ],
  };
}
```

### 3.2. Scrollspy и Интерактивно съдържание ([`LegalTableOfContents.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/legal/components/LegalTableOfContents.tsx))
- Използва `IntersectionObserver` с праг на засичане за автоматично маркиране на активната клауза при превъртане на страницата.
- Плавна навигация до точната секция (`behavior: 'smooth'`) с компенсация за височината на фиксирания хедър (`scroll-mt-24`).
- Адаптивен дизайн:
  - **Десктоп (lg+)**: Фиксирана лява колона (`sticky top-28`).
  - **Мобилни устройства**: Сгъваемо хоризонтално меню с хоризонтално превъртане.

### 3.3. Функция за директен печат и PDF експорт
Хедърът [`LegalHeader.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/legal/components/LegalHeader.tsx) предлага бутон „Разпечатай документ“ (`window.print()`). Печатните CSS стилове скриват навигационните ленти, бутоните за смяна на език и декоративните градиенти, форматирайки документа за стандартен черен печат на хартия.

### 3.4. Защита на данните и DPO интеграция
Съгласно чл. 37–39 от GDPR, на видно място във футъра и в самата Политика за поверителност са публикувани официалните контакти на Длъжностното лице по защита на данните:
- Имейл за упражняване на права: `privacy@smartscanstay.com` / `dpo@smartscanstay.com`.
- Посочване на водещия надзорен орган в ЕС: Комисия за защита на личните данни (КЗЛД), София, България.

---

## 4. Верификация и резултати от тестовете

- **TypeScript (`npx tsc --noEmit`)**: 0 грешки (стриктна типова безопасност без `any`).
- **ESLint**: 0 грешки.
- **Next.js Production Build**: Страниците `/terms` и `/privacy` се компилират успешно с поддръжка на всички 10 езика и динамично SEO генериране.
- **CodeRabbit Review**: Преминато пълно автоматизирано ревю на сигурността, достъпността и мемоизацията на съдържанието.
