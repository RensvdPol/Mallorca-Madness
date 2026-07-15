# Mallorca Madness v3

## Nieuwe functies
- Groepsinzendingen: iedere geselecteerde deelnemer krijgt automatisch de volledige punten.
- Publiek-account met alleen feed, stand en opdrachten.
- Jury en admin kunnen een moment van de dag publiceren met begin- en eindtijd op dezelfde dag.
- Geheime opdrachten per deelnemer; na goedkeuring worden ze zichtbaar in de feed.
- Bonusopdrachten selecteren automatisch alle zeven deelnemers.
- Kaapbare opdrachten: wanneer de jury een nieuwe prestatie goedkeurt, wordt de vorige goedgekeurde inzending `superseded` en worden de punten automatisch verplaatst.
- Opdrachten kunnen via `beschikbaar vanaf/tot` halverwege de week online komen.

## Installatie
1. Voer `supabase/migrations/20260715_v3.sql` uit in Supabase SQL Editor.
2. Vervang de bestanden in je GitHub-repository door deze projectmap en commit.
3. Netlify bouwt automatisch opnieuw.

## Publiek-account maken
Maak in Supabase Authentication een gebruiker:
- e-mail: `publiek@mallorca-madness.local`
- kies zelf een wachtwoord en zet Auto Confirm aan.

Voer daarna in SQL Editor uit:
```sql
update public.profiles
set display_name='Publiek', role='spectator'
where id=(select id from auth.users where email='publiek@mallorca-madness.local');
```

## Kaapbare opdrachten
De jury beoordeelt of de nieuwe prestatie daadwerkelijk beter is. Bij goedkeuring:
- krijgt de nieuwe houder de punten;
- wordt de oude inzending `superseded`;
- verdwijnen de punten direct bij de oude houder.

Voorbeelden:
- meeste Mallorca-shirtjes: `better_is = max`, eenheid `shirtjes`;
- snelste 0,3 l: `better_is = min`, eenheid `seconden`.
