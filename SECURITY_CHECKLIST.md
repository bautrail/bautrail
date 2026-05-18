# Baudoku Security Checklist

Nutze diese Liste bei jeder Aenderung, Migration oder vor einem Release.

## 1) Schema
- [ ] Neue relevante Tabelle hat `company_id uuid`.
- [ ] `company_id` zeigt auf `public.companies(id)` oder ist sauber indirekt ueber Projekt/Kunde verknuepft.
- [ ] Relevante Indizes auf `company_id` vorhanden.

## 2) RLS (Row Level Security)
- [ ] `RLS` ist auf der Tabelle aktiviert.
- [ ] `SELECT`-Policy vorhanden.
- [ ] `INSERT`-Policy vorhanden.
- [ ] `UPDATE`-Policy vorhanden.
- [ ] `DELETE`-Policy vorhanden.
- [ ] Policy prueft Firmenzugehoerigkeit ueber `company_members` und `auth.uid()`.

## 3) Storage-Sicherheit
- [ ] Bucket-Policies vorhanden (z. B. `bilder`).
- [ ] Zugriff nur fuer Mitglieder der passenden Firma.
- [ ] Upload/Download/Delete im Bucket sind auf Firmenkontext begrenzt.

## 4) Daten-Backfill nach Migrationen
- [ ] Alt-Daten haben keine `company_id = null` mehr.
- [ ] Check fuer `customers`, `projects`, `auftraege` ausgefuehrt.
- [ ] Falls noetig: Backfill fuer `project_images`, `project_documents`, `project_audio`, `project_folders` ausgefuehrt.

## 5) Frontend-Abfragen
- [ ] Keine ungefilterten Fallback-Queries ohne `company_id`.
- [ ] Keine Debug-Abfragen, die global alle Daten laden.
- [ ] Rollen-abh. Bereiche korrekt ein/ausgeblendet.

## 6) Rollen & Rechte
- [ ] Chef darf Verwaltung/Firma/Einladungen.
- [ ] Buero darf operative Verwaltung (Kunden/Projekte/Auftraege/Planung).
- [ ] Mitarbeiter sieht nur eigene oder zugewiesene Daten, wo vorgesehen.
- [ ] Rollenlogik in UI und RLS ist konsistent.

## 7) Einladungscode-Sicherheit
- [ ] Code wird serverseitig konsumiert (RPC/Funktion).
- [ ] Code ist nur einmal nutzbar (`active=false` nach Nutzung).
- [ ] Optional: Ablaufdatum wird geprueft.
- [ ] Rolle aus Code wird validiert.

## 8) Kurztest im UI (5 Klicks)
- [ ] Chef (Firma A) sieht eigene Daten.
- [ ] Chef erstellt Testkunde/Projekt/Auftrag.
- [ ] Upload (Bild/Dokument/Audio) erfolgreich.
- [ ] Mitarbeiter derselben Firma sieht die Daten.
- [ ] Account aus anderer Firma sieht diese Daten nicht.

## 9) SQL-Pruefungen
- [ ] Count-Checks auf `company_id is null` ergeben 0.
- [ ] Erweiterter RLS-Smoketest gelaufen (`supabase/tests/...extended_auto.sql`).

## 10) Vor Release
- [ ] Alle neuen Migrationen in Reihenfolge auf Staging/Prod ausgefuehrt.
- [ ] Keine offenen RLS-/Storage-Fehler in Logs.
- [ ] Test mit 2 Firmenkonten erfolgreich.

