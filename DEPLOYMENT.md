# Baudoku online stellen

## Ziel

Die App soll nicht mehr auf dem eigenen PC laufen, sondern ueber eine feste Domain erreichbar sein, zum Beispiel:

```text
https://app.deine-domain.de
```

## Einfacher Weg

Fuer diese App ist ein Node-Hosting passend, weil der Server bereits die Web-App aus `public/` ausliefert und den E-Mail-Endpunkt bereitstellt.

Geeignete Hosting-Arten:

- Node-App-Hosting wie Render, Railway, Fly.io oder ein VPS
- Alternativ: Frontend als statische PWA hosten und den E-Mail-Endpunkt als Supabase Edge Function bauen

## Einstellungen beim Host

Root/Projektordner:

```text
server
```

Install Command:

```text
npm install
```

Start Command:

```text
npm start
```

Der Server nutzt automatisch den Port, den der Host uebergibt:

```text
PORT
```

## Umgebungsvariablen

Wenn der PDF-/E-Mail-Versand genutzt werden soll, muessen diese Variablen beim Host eingetragen werden:

```text
RESEND_API_KEY=...
REPORT_FROM_EMAIL=...
```

`REPORT_FROM_EMAIL` sollte eine bestaetigte Absenderadresse sein, zum Beispiel:

```text
Baudoku <nachweise@deine-domain.de>
```

## Domain verbinden

Beim Hosting-Anbieter wird die Domain eingetragen, zum Beispiel:

```text
app.deine-domain.de
```

Danach zeigt der Anbieter an, welche DNS-Eintraege beim Domain-Anbieter gesetzt werden muessen. Typisch ist:

```text
CNAME app -> host-name-des-anbieters
```

Oder bei einer Hauptdomain:

```text
A @ -> IP-Adresse
```

Die genauen Werte kommen immer vom Hosting-Anbieter.

## Danach testen

1. `https://app.deine-domain.de` im Browser oeffnen
2. Am Handy oeffnen
3. Login testen
4. Stundennachweis speichern
5. Chef-Dashboard testen
6. PDF-/E-Mail-Versand testen
7. Am Handy "Zum Startbildschirm hinzufuegen" auswaehlen

## Wichtig

Damit die Handy-App installierbar ist, muss die Seite ueber HTTPS laufen. Das machen moderne Hosting-Anbieter normalerweise automatisch, sobald die Domain verbunden ist.
