# User Flow

## Start and invite

- **Home** shows one game CTA, **Start Quiz**. The site header has **Share**. The artwork carries the 8-question badge.
- **Start Quiz** opens Q1 and creates a room in the background. Sharing first from Home can create the room early. Starting after copying uses the same room.
- **Invited player** opens the link and lands on Q1. Players can answer and submit at different times. There is no lobby step.
- **Share** opens a modal from any screen. During the quiz and on results it offers the room invite. Results also offer a distinct **Guess my answer** link, with a compact horizontal preview. Viewing that link does not enter the room.
- **After Q8**, enter a nickname and pick a sticker. Submitting sends that player's answers to the room. Optional Q8 can be skipped.

## Results

- **Personal result** opens immediately. The color swatches change only the recap. The displayed Pop Cover is the PNG that **Save image** exports.
- **No friend has submitted** means the main action is **Share with friends**. The player can leave and return to their result later in the same browser.
- **A friend has submitted** means the main action is **See everyone’s answers**. The local app checks for later submissions while the personal result is visible.
- **Group reveal** compares submitted answers and includes a short prompt to keep talking. The single-submission state remains in Demo for review.
- **QR recap** opens a public recap view containing the selected card data. **Guess my answer** opens the question and options for a friend to guess and reply.

## Seat concept

Count people when they actually start, rather than when they merely open an invite. The host can appear as “You” before picking an avatar. Separate joined from submitted status when that feature is built. Current local rooms track submissions only. The Demo seat strip is explanatory, with no enforced limit.
