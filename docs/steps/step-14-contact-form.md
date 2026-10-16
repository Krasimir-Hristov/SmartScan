# Стъпка 14: Contact Form с директно съхранение в Supabase & Планиране на Owner Admin

> **Статус**: 🟢 Завършена и слята в `main` (Pull Request #17, commit `214888a`)  
> **Дата на завършване**: 15 октомври 2026 г.  
> **Нормативна рамка**: Регламент (ЕС) 2016/679 (GDPR), Директива 2002/58/ЕО (ePrivacy).  
> **Референтни документи**: [`ROADMAP.md`](../../ROADMAP.md), [`AGENTS.md`](../../AGENTS.md), [`docs/README.md`](../README.md).

---

## 1. Резюме и Архитектурни цели

Формата за контакт (`/contact`) в SmartScan Stay предоставя надежден, сигурен и високотехнологичен канал за връзка между потенциални клиенти, хазяи и екипа на платформата.

Основните инженерни и бизнес изисквания, заложени при разработката:

1. **Директно съхранение в базата данни (Zero-Email за MVP старт)**:
   - Всички клиентски съобщения се валидират и записват директно в защитена Supabase таблица `public.contact_messages`.
   - За MVP фазата се избягва зависимост от външни транзакционни имейл сървъри (Resend, SendGrid, SMTP), осигурявайки нулева латентност и мигновена надеждност.
   - Запазени са чисти архитектурни точки на свързване (hooks) за бъдещо активиране на автоматични имейл нотификации.
2. **Защита на личните данни и превенция срещу скрапинг (Anti-Scraping & GDPR)**:
   - В страницата `/contact` категорично **не се визуализират публичен имейл адрес или телефонен номер**, за да се предотврати автоматизирано извличане (harvesting) от спам ботове и телемаркетинг агенции.
   - Потребителят дава изрично съгласие за обработка на предоставените данни съгласно Политиката за поверителност.
3. **Поле за телефон с валидация на реални цифри**:
   - Клиентът може опционално да остави телефонен номер за спешен контакт или търговско запитване.
   - Въведена е трислойна валидация (Zod schema ➔ PostgreSQL RPC ➔ Table `CHECK` constraint), изискваща дължина до 35 символа, допустими международни символи и задължително поне една цифра (`[0-9]`).
4. **Мащабируемост за бъдещ AI Триаж & Админ панел на собственика**:
   - В схемата на таблицата са заложени полета за автоматичен анализ с изкуствен интелект (`ai_summary`, `ai_sentiment`, `ai_suggested_reply`), нива на спешност (`priority`) и статуси на жизнения цикъл (`status`: `unread`, `read`, `archived`, `replied`).
5. **Многостепенна защита от спам и DoS атаки**:
   - Невидим спам капан (**Honeypot trap**).
   - Криптографски **HMAC-SHA256** хеш на клиентския IP адрес със сървърен секретен ключ (без твърд резервен литерал).
   - Атомарно транзакционно заключване в PostgreSQL (`pg_advisory_xact_lock`) срещу race condition атаки.
   - Стриктен лимит от максимум 5 съобщения за 10 минути на хеширан IP.

---

## 2. Архитектура на модул `src/features/contact/`

Модулът е напълно капсулиран в `frontend/src/features/contact/` и експортира своя интерфейс единствено през `index.ts`:

```text
frontend/src/
├── app/
│   └── contact/
│       └── page.tsx                   # Асинхронен Next.js 16 route с динамично 10-езиково SEO (generateMetadata)
│
├── features/
│   ├── contact/
│   │   ├── actions/
│   │   │   └── sendContactAction.ts   # Next.js Server Action с Zod валидация, HMAC IP и Admin RPC
│   │   ├── components/
│   │   │   ├── ContactForm.tsx        # Контейнер за управление на формата, стейта и transitions (< 150 реда)
│   │   │   ├── ContactFormFields.tsx  # Полета на формата с пълна WAI-ARIA достъпност и локализирани грешки (< 300 реда)
│   │   │   ├── ContactSuccessState.tsx# Екран за потвърждение след успешно изпращане
│   │   │   ├── ContactHeader.tsx      # Заглавна секция с баджове за 24h SLA и криптиране
│   │   │   └── ContactNavbar.tsx      # Obsidian навигация с бутон за връщане и езиков селектор
│   │   ├── types/
│   │   │   └── contactTypes.ts        # Стриктни TypeScript типове (ContactFormData, ContactActionResult)
│   │   ├── ContactPage.tsx            # Главен визуален шаблон на страницата
│   │   └── index.ts                   # Публичен Barrel Export на модула
│   │
│   └── landing/
│       ├── components/
│       │   └── LandingFooter.tsx      # Футър с директна връзка към /contact на 10 езика
│       └── index.ts                   # Експортира LandingFooter през публичния barrel файл
│
└── lib/
    ├── supabase/
    │   ├── admin.ts                   # createAdminClient() със стриктно изискване на service_role ключ
    │   ├── client.ts                  # Клиентски Supabase Browser Client
    │   └── server.ts                  # Сървърен клиент с бисквитки (@supabase/ssr)
    └── types/
        └── databaseTypes.ts           # Актуализирани интерфейси за contact_messages и submit_contact_message RPC
```

---

## 3. База данни & Защитен слой в Supabase

### 3.1. Таблица `public.contact_messages`

Миграционен файл: [`supabase/migrations/20261014000001_create_contact_messages.sql`](file:///d:/myProjects/smart_scan/supabase/migrations/20261014000001_create_contact_messages.sql)

```sql
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(35) CHECK (phone IS NULL OR (length(phone) >= 5 AND length(phone) <= 35 AND phone ~ '[0-9]' AND phone ~ '^[\+0-9\s\(\)\-\.]+$')),
    subject VARCHAR(50) NOT NULL DEFAULT 'general',
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread'
        CHECK (status IN ('unread', 'read', 'archived', 'replied')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    ai_summary TEXT,
    ai_sentiment VARCHAR(20),
    ai_suggested_reply TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_hash VARCHAR(64),
    user_agent VARCHAR(500),
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 3.2. Строга Row Level Security (RLS) & Privilege Isolation

За предотвратяване на заобикаляне на Rate Limiter-а чрез директни REST заявки към Supabase:
- **Забрана на директен публичен достъп**:
  ```sql
  ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.contact_messages FROM PUBLIC, anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_messages TO service_role;
  ```
- Всички директни `INSERT` и `SELECT` операции от анонимни или стандартно автентикирани потребители са категорично блокирани.

### 3.3. Атомарна RPC функция с Advisory Locking (`submit_contact_message`)

Функцията се изпълнява като `SECURITY DEFINER` и е достъпна **единствено за `service_role`**:

```sql
CREATE OR REPLACE FUNCTION public.submit_contact_message(
    p_name TEXT,
    p_email TEXT,
    p_subject TEXT,
    p_message TEXT,
    p_phone TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_recent_count INT := 0;
    v_message_id UUID;
    v_clean_name TEXT;
    v_clean_email TEXT;
    v_clean_phone TEXT;
    v_clean_subject TEXT;
    v_clean_message TEXT;
BEGIN
    IF p_ip_hash IS NULL OR trim(p_ip_hash) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_IP_HASH');
    END IF;

    -- Транзакционно заключване за сериализиране на заявките от един и същ IP адрес
    PERFORM pg_advisory_xact_lock(hashtext(p_ip_hash));

    v_clean_name := trim(p_name);
    v_clean_email := lower(trim(p_email));
    v_clean_phone := CASE WHEN p_phone IS NOT NULL AND trim(p_phone) <> '' THEN trim(p_phone) ELSE NULL END;
    v_clean_subject := trim(p_subject);
    v_clean_message := trim(p_message);

    -- Валидация на дължина и формати
    IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
    END IF;

    IF length(v_clean_email) < 5 OR length(v_clean_email) > 150 OR v_clean_email NOT LIKE '%@%.%' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_EMAIL');
    END IF;

    IF v_clean_phone IS NOT NULL AND (length(v_clean_phone) < 5 OR length(v_clean_phone) > 35 OR v_clean_phone !~ '[0-9]' OR v_clean_phone !~ '^[\+0-9\s\(\)\-\.]+$') THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE');
    END IF;

    IF length(v_clean_message) < 10 OR length(v_clean_message) > 3000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_MESSAGE');
    END IF;

    -- Rate limit проверка: максимум 5 съобщения за 10 минути от същия хеширан IP
    SELECT count(*)
    INTO v_recent_count
    FROM public.contact_messages
    WHERE ip_hash = p_ip_hash
      AND created_at > (now() - interval '10 minutes');

    IF v_recent_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'RATE_LIMIT');
    END IF;

    -- Запис на съобщението
    INSERT INTO public.contact_messages (
        name, email, phone, subject, message, ip_hash, user_agent, status, priority, metadata
    ) VALUES (
        v_clean_name, v_clean_email, v_clean_phone, v_clean_subject, v_clean_message, p_ip_hash, p_user_agent, 'unread', 'normal', '{}'::jsonb
    )
    RETURNING id INTO v_message_id;

    RETURN jsonb_build_object('success', true, 'id', v_message_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
```

---

## 4. Сигурност и Криптографски стандарти

### 4.1. HMAC-SHA256 IP хеширане
В [`sendContactAction.ts`](file:///d:/myProjects/smart_scan/frontend/src/features/contact/actions/sendContactAction.ts) клиентският IP адрес се извлича през сигурните заглавия на проксито (`x-vercel-forwarded-for`, `x-forwarded-for`, `x-real-ip`) и се хешира чрез `crypto.createHmac`:
- Секретният ключ се зарежда динамично от средата: `BACKEND_PROXY_SECRET`, `SUPABASE_SECRET_KEY` или `SUPABASE_SERVICE_ROLE_KEY`.
- Премахнат е всякакъв хардкоднат fallback стринг, гарантирайки невъзможност за rainbow table атаки при неоторизиран достъп до сорс кода.

### 4.2. Административен клиент за Server Actions ([`admin.ts`](file:///d:/myProjects/smart_scan/frontend/src/lib/supabase/admin.ts))
- Създава клиент чрез `@supabase/supabase-js`, изискващ на 100% сервизен секретен ключ.
- Липсват резервни варианти с публичен ключ, което предотвратява фалшиво изпълнение и незабелязани грешки с правата.

### 4.3. WAI-ARIA достъпност (A11y)
Във формата [`ContactFormFields.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/contact/components/ContactFormFields.tsx):
- Всеки контрол получава динамичен `aria-invalid={Boolean(fieldErrors.field)}`.
- При възникнала грешка се закача `aria-describedby="{field}-error"`.
- Параграфите за грешка имат уникални идентификатори и семантичен атрибут `role="alert"`, осигурявайки съвместимост с екранни четци (Screen Readers).

---

## 5. 10-езикова локализация (`next-intl`)

Всички съобщения, етикети, подсказки и валидационни грешки са преведени с пълен паритет в 10-те европейски локала:

| Език | Код | Етикет за телефон | Подсказка | Грешка за дължина | Грешка за формат |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **English** | `en` | Phone Number | e.g. +359 88 123 4567 | Phone number must be at most 35 characters. | Please enter a valid phone number. |
| **Български** | `bg` | Телефонен номер | напр. +359 88 123 4567 | Телефонният номер може да бъде най-много 35 символа. | Моля, въведете валиден телефонен номер. |
| **Deutsch** | `de` | Telefonnummer | z. B. +49 170 1234567 | Die Telefonnummer darf maximal 35 Zeichen lang sein. | Bitte geben Sie eine gültige Telefonnummer ein. |
| **Română** | `ro` | Număr de telefon | ex. +40 721 123 456 | Numărul de telefon poate avea cel mult 35 de caractere. | Vă rugăm să introduceți un număr de telefon valid. |
| **Ελληνικά** | `el` | Αριθμός τηλεφώνου | π.χ. +30 691 123 4567 | Ο αριθμός τηλεφώνου μπορεί να έχει έως 35 χαρακτήρες. | Παρακαλούμε εισάγετε έναν έγκυρο αριθμό τηλεφώνου. |
| **Русский** | `ru` | Номер телефона | напр. +7 999 123-45-67 | Номер телефона должен содержать не более 35 символов. | Пожалуйста, введите корректный номер телефона. |
| **Türkçe** | `tr` | Telefon Numarası | ör. +90 532 123 4567 | Telefon numarası en fazla 35 karakter olabilir. | Lütfen geçerli bir telefon numarası girin. |
| **Español** | `es` | Número de teléfono | ej. +34 612 345 678 | El número de teléfono debe tener como máximo 35 caracteres. | Por favor, introduzca un número de teléfono válido. |
| **Italiano** | `it` | Numero di telefono | es. +39 345 123 4567 | Il numero di telefono può contenere al massimo 35 caratteri. | Inserisci un numero di telefono valido. |
| **Français** | `fr` | Numéro de téléphone | ex. +33 6 12 34 56 78 | Le numéro de téléphone doit comporter 35 caractères maximum. | Veuillez saisir un numéro de téléphone valide. |

---

## 6. Стратегическа интеграция: Стъпка 15 в `ROADMAP.md`

В рамките на тази стъпка дефинирахме и добавихме в [`ROADMAP.md`](../../ROADMAP.md) следващия ключов етап: **Стъпка 15: Owner Admin Control Plane & Analytics (Админ панел за собственика)**.

Основни направления в бъдещия панел:
1. **Административна автентикация & RBAC**: Защитен достъп през `is_platform_admin` флаг или DAL проверка, достъпен единствено за собственика на SmartScan Stay.
2. **Управление на запитванията (`/admin/contacts`)**: Централизиран преглед на получените запитвания, филтриране по статус (`unread`, `read`, `archived`, `replied`), приоритет (`low`, `normal`, `high`, `urgent`) и търсене по име, имейл или телефон.
3. **Клиентска директория**: Пълен поглед върху регистрираните хазяи (`hosts`), активните им пространства (`spaces`) и абонаментни данни от Stripe.
4. **AI Triaging с Gemini Flash**: Автоматично генериране на резюме (`ai_summary`), определяне на сантимент (`ai_sentiment`) и предложение за готов отговор (`ai_suggested_reply`).
5. **Аналитика в реално време**: Мониторинг на ключови показатели — сканирания на QR кодове, брой активни сесии, проведени разговори с AI консиержа и процент на автоматично разрешени казуси без намеса на хазяина.
6. **Директен отговор**: Изпращане на имейл отговори директно от админ панела с автоматично отбелязване на `replied_at` и преминаване в статус `replied`.

---

## 7. Резултати от верификацията и прегледа на CodeRabbit

- **CodeRabbit AI Review**:
  - Всички забележки от Първи, Втори и Трети рунд бяха успешно разрешени (HMAC IP salt, премахване на fallback към publishable key, изискване за поне една цифра в телефона, модулно разделяне на полетата, A11y атрибути и синхронизация на статусите в базата данни).
- **TypeScript (`npx tsc --noEmit`)**: Изходен код 0 (0 грешки).
- **ESLint (`npx eslint`)**: Изходен код 0 (0 предупреждения / 0 грешки).
- **Next.js Production Build (`npm run build`)**: 0 грешки, успешна компилация за 10.5s – 18.0s с генериран динамичен SSR маршрут `ƒ /contact`.
- **Git интеграция**: Слят Pull Request #17 в `main` клон чрез Fast-Forward с чиста commit история.
