# Урок 2: Формальный анализ протоколов — BAN-логика и автоматическая верификация

## Введение

Ручной анализ протоколов ненадёжен: история криптографии полна примеров протоколов, считавшихся безопасными годами до обнаружения атак. Формальные методы позволяют **автоматически** проверять свойства безопасности.

---

## 1. BAN-логика (Burrows-Abadi-Needham)

BAN-логика — модальная логика для рассуждений о знаниях и убеждениях участников протокола.

### Основные операторы

| Нотация | Смысл |
|---|---|
| `P believes X` | P убеждён, что X истинно |
| `P sees X` | P получил сообщение, содержащее X |
| `P said X` | P в какой-то момент отправил X |
| `P controls X` | P является авторитетом в вопросе X |
| `fresh(X)` | X — свежее значение (не воспроизведение) |
| `{X}_K` | X зашифровано ключом K |
| `P ←K→ Q` | K — хороший разделяемый ключ между P и Q |

### Основные правила вывода

**Message meaning rule:**
```
P believes (P ←K→ Q),  P sees {X}_K
──────────────────────────────────────
P believes (Q said X)
```

**Nonce verification rule:**
```
P believes fresh(X),  P believes (Q said X)
────────────────────────────────────────────
P believes (Q believes X)
```

### Пример анализа протокола NSL

Протокол Needham-Schroeder-Lowe:
```
1. A → B : {Na, A}_Kb
2. B → A : {Na, Nb, B}_Ka    ← ключевое добавление: явное имя B
3. A → B : {Nb}_Kb
```

**Цель:** `A believes (A ←Ks→ B)` и `B believes (A ←Ks→ B)`

После применения правил BAN-логики к каждому шагу можно формально вывести, что обе стороны устанавливают взаимную аутентификацию.

---

## 2. ProVerif — автоматическая верификация

[ProVerif](https://bblanche.gitlabpages.inria.fr/proverif/) — инструмент автоматической верификации криптографических протоколов на основе исчисления процессов (applied pi calculus).

### Установка

```bash
# Через opam (OCaml package manager)
opam install proverif

# Или скачать бинарник с официального сайта
```

### Описание протокола на языке ProVerif

```proverif
(* Объявление типов *)
free c: channel.           (* публичный канал *)
free s: channel [private]. (* закрытый канал *)

(* Типы данных *)
type key.
type nonce.

(* Функции *)
fun enc(bitstring, key): bitstring.  (* шифрование *)
reduc forall m: bitstring, k: key;
  dec(enc(m, k), k) = m.             (* дешифрование *)

fun pk(key): key.  (* публичный ключ из приватного *)

(* Свойство: секретность nonce *)
free Na: nonce [private].
query attacker(Na).

(* Процесс Алисы *)
let Alice(ska: key, pkb: key) =
  new Na: nonce;
  out(c, enc((Na, pk(ska)), pkb));
  in(c, m: bitstring);
  let (=Na, Nb: nonce, =pkb) = dec(m, ska) in
  out(c, enc(Nb, pkb)).

(* Процесс Боба *)
let Bob(skb: key, pka: key) =
  in(c, m: bitstring);
  let (Na: nonce, =pka) = dec(m, skb) in
  new Nb: nonce;
  out(c, enc((Na, Nb, pk(skb)), pka));
  in(c, m2: bitstring);
  let (=Nb) = dec(m2, skb) in
  0.

(* Главный процесс *)
process
  new ska: key; new skb: key;
  (Alice(ska, pk(skb)) | Bob(skb, pk(ska)))
```

### Запуск и интерпретация результатов

```bash
proverif protocol.pv
```

```
RESULT not attacker(Na[]) is true.   ✓ Na остаётся секретной
RESULT inj-event(endB(...)) ==> inj-event(beginA(...)) is true.  ✓ Аутентификация
```

---

## 3. Tamarin Prover

Tamarin — более мощный инструмент, поддерживающий **эквациональные теории** и **неограниченные сессии**.

```tamarin
theory NSL
begin

builtins: asymmetric-encryption

rule Alice_init:
  [ Fr(~na), !Pk($B, pkB) ]
  -->
  [ Out(aenc(<~na, $A>, pkB)), St_Alice_1($A, $B, ~na) ]

rule Bob_respond:
  [ In(aenc(<na, $A>, pk(~skB))), Fr(~nb), !Pk($A, pkA) ]
  -->
  [ Out(aenc(<na, ~nb, $B>, pkA)), St_Bob_1($A, $B, na, ~nb) ]

lemma secrecy_Na:
  "All A B na #i. Secret(A, B, na)@i ==> not(Ex #j. K(na)@j)"

end
```

---

## 4. Сравнение инструментов

| Инструмент | Подход | Сильные стороны | Ограничения |
|---|---|---|---|
| **BAN-логика** | Ручной вывод | Интуитивна, педагогична | Неполна, много ложных доказательств |
| **ProVerif** | Автоматический (Horn clauses) | Быстрый, полностью автоматический | Приближённый анализ |
| **Tamarin** | Полуавтоматический | Точный, поддерживает XOR и DH | Требует направляющих лемм |
| **Scyther** | Автоматический | Прост в использовании | Ограниченные криптопримитивы |

---

## Практическое задание

1. Установите ProVerif и запустите пример выше.
2. Добавьте в протокол атаку man-in-the-middle (уберите `pkb` из второго сообщения) и убедитесь, что ProVerif обнаружит нарушение секретности `Na`.
3. Напишите на BAN-логике вывод для шага 2 протокола NSL.

---

## Итоги урока

- BAN-логика позволяет рассуждать об убеждениях участников, но неполна.
- ProVerif — быстрый автоматический верификатор, основанный на Horn clauses.
- Tamarin обеспечивает точный анализ с поддержкой продвинутых криптопримитивов.
- Формальная верификация — обязательный этап проектирования серьёзных протоколов.

---

*Следующий урок: TLS 1.3 — архитектура и анализ рукопожатия.*
