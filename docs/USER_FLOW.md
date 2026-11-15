# Little Things · User flow

Current flow for **日常小纠结 / Everyday Dilemmas**. [FigJam breadboard](https://www.figma.com/board/0nb0s68wPrqhhbO1zDixAW/Little-Things---Hackathon---Nov-14?node-id=6-162)

## Start and play

1. **Home** → **Start Quiz** creates a round and opens Q1.
2. **Friend opens the invite** → sees the pack cover and “A friend is already in this round” alongside the open spots. **Start Quiz** joins the same round and opens Q1. Opening the link alone does not occupy a spot.
3. **Quiz** → answer eight questions at your own pace. Back preserves answers. Q8 can be skipped.
4. **Nickname & avatar** → choose a nickname and sticker, then **Submit** to open your personal recap.

## Invite during the quiz

Below the question card, show **You + 1 friend · 3 spots left** and the invite action. Counts update automatically.

- **Spots available** → **Copy invite link** copies the round link in one tap. Show “Link copied.” on the same page.
- **Free spots used** → **Watch an ad to unlock a spot** opens the standalone Example ad screen from any room action. See the test ad flow below.
- **In chat** → that same link displays a fixed preview with the pack title, art and short invitation. It opens the invite cover. The preview uses no player name, avatar or live count.

## Room capacity and player identity

- The MVP room has five seats, including the host. Anyone can open the same invitation link. A seat is reserved only when a player's **Start Quiz** request succeeds.
- The same browser profile normally resumes the seat and saved progress for that room. A second browser, device or private window has a separate seat if the player starts there.
- If four friends try to start with two seats left, the first two successful join requests get them. The other two see the full-room state on the invite cover. Capacity is checked again when **Start Quiz** is pressed.
- A player who joins and leaves before submitting keeps their seat in the current MVP. Room progress reflects joins and submissions, so the waiting count includes anyone who joined and has yet to submit. It does not measure whether their browser is still active.

## After submission

The personal recap places **Save image** beside the live room status directly below the poster. **My answers** lists the player’s eight answers beneath the room actions in every room state. **See group results** sits above **Copy invite link** once at least one friend joins.

- **Only you** → show open spots. **Copy invite link** is primary. **See group results** appears when a friend joins.
- **One submitted, a friend has joined** → show **Waiting for 1 friend to submit** (or the plural), then open spots. **See group results** is visible and disabled.
- **Two or more submitted, others pending** → show **2 of 3 submitted** (with live counts), then open spots. **See group results** is available to any player who has submitted.
- **Everyone submitted** → show **Everyone’s submitted**, then open spots. **See group results** remains available if a new player joins.
- **Group results** → compare submitted answers and show the submitted count below the title. Counts, avatars and answers update in place when a newcomer joins or submits. **← My recap** at the top and **See my recap** at the bottom both return to the personal recap. At the bottom, the primary invite action sits above **See my recap**.
- **Recap QR** → opens Shared recap. New poster links open the player’s full answer list, described below. An invalid room invite offers **Find something to play**.

## Live status and open decisions

Refresh joined and submitted counts automatically every three seconds while a round is visible, and immediately on reconnect or return to the tab. The server returns other players’ answers only to a player who has submitted and only after at least two submissions exist.

The MVP starts with five seats and blocks new joins at capacity until the example ad unlocks more, up to 20. An idle player still keeps their seat. Once two answers are in, the idle player no longer blocks results. Releasing idle seats and integrating live ads are open.


## Example ad

1. On quiz, Sign your answers, Personal recap, or Group results, press **Watch an ad to unlock a spot** at capacity. The full-screen ad opens over the current page.
2. A five-second example starts automatically. The playback controls show progress and time remaining. Escape closes it early and leaves capacity unchanged.
3. Completion unlocks one seat and briefly reveals **Done**. Pressing it returns immediately; otherwise the ad returns to the source page after two seconds. It then attempts to copy the existing invite link and refreshes the open-spot count. The toast reads **1 spot unlocked · Link copied** on success. If automatic copying is blocked, it reads **1 spot unlocked**, and **Copy invite link** is available on the source page.
4. The hosted Supabase version behaves the same; the reward runs through the `unlock_example_spot` database function. A round tops out at 20 seats, after which the ad reports that no spot could be unlocked.

### Manual playtest

Open the same local room in Chrome normal, Chrome private, and Safari. Submit from two browsers while the third is still answering, then open Group results. Submit the third and confirm its answers appear without a refresh. Repeat with the third joining after the result is already open. For the example ad, either use five local browser profiles or choose **测试广告** in the [local debug view](http://127.0.0.1:4188/?debug=1). Try Escape during playback, **Done**, and the automatic return.

## Link previews

- **Copy invite link** shares the room URL. Its fixed Open Graph image is the horizontal last-bite teaser in `invite-preview.png`. The preview uses no player avatar, nickname, or answers. Opening the link shows the invite cover. A new guest joins only after pressing **Start Quiz**.
- **The poster QR** points to the public Shared recap at `recap.html`. New poster QR links display the sharer’s full answer list. Existing poster links keep their original view.


## Shared recap

1. A friend scans the QR on a shared poster or opens the shared recap link.
2. The **Shared recap** shows the sharer’s nickname and avatar, then all eight questions in pack order with that player’s answers. It uses the question-by-question layout from screen 18. The page has no header Share action. The poster and the saving screen explain that anyone with the link can see all eight answers.
3. **Try the same quiz** opens the Everyday Dilemmas cover. **Start Quiz** creates a new round. The room invite remains the entry point for joining the sharer’s round.

Personal recap uses the same question sections inline below the room actions.
