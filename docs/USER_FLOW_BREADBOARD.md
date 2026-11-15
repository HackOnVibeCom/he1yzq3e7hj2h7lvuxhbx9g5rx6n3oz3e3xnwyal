# Little Things · Flow breadboard

[Editable FigJam board](https://www.figma.com/board/0nb0s68wPrqhhbO1zDixAW/Little-Things---Hackathon---Nov-14?node-id=6-162) · [Full user flow](USER_FLOW.md) · [Diagram source](figjam-breadboard.mmd)

- **Home** — pack cover, eight questions, **Start Quiz** → create round and open Q1.
- **Invite cover** — invitation, pack cover and open spots, **Start Quiz** → join round and open Q1.
- **Quiz** — progress, corner question sticker, prompt, answer control, **Back / Next**, **Skip** on Q8. Below the card, show joined and available spots. **Copy invite link** copies directly. At capacity, show **Watch an ad to unlock a spot**. It opens the Example ad screen.
- **Sign your answers** — corner flower sticker, nickname field, avatar picker, **Back / Submit** and the round’s invite row.
- **Personal recap** — image, colors, QR, **Save image** text action with a download icon, live room status and stacked actions. **My answers** is always below the room actions. Alone → open spots and **Copy invite link**. **See group results** appears above **Copy invite link** when a friend joins and is enabled when the viewer and at least one other person have submitted. The progress line shows waiting, a submitted count, or everyone submitted.
- **Group results** — **← My recap** at the top, live submitted count, submitted players’ avatars and names, then the question-by-question comparison. At the bottom, **Copy invite link** is primary, with **See my recap** beneath it.
- **Fixed chat preview** — pack title, last-bite teaser image and one-line invitation. Opens the invite cover.
- **Shared recap** — opens from the saved image QR or recap link. Nickname, avatar, eight questions and the sharer’s answers in a single-player layout based on screen 18. No header Share action. **Try the same quiz** below the answers → pack cover. Existing poster links still show the poster.
- **Invite unavailable** — invalid or expired link, **Find something to play**.

- **Example ad** — full-screen placeholder from any full-room invite action. Progress and countdown at the top, with the reward explanation above **Example ad**. At completion, **Done** appears as the primary action. Return immediately on tap or automatically after two seconds, then show the reward and copy status in a toast. Works the same locally and hosted, up to 20 seats.
