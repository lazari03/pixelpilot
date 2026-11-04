# Teaching with PixelPilot

## Before class

1. Apply the updated `supabase/setup.sql` in your Supabase SQL editor. It preserves student progress and teacher-created lessons. For an existing installation, `004_teacher_lessons.sql` adds the editor; apply `seed-course.sql` too for the simpler starter wording.
2. Run the configured `bootstrap-classroom.sql` if your teacher/student/owner roles and classroom memberships are not yet assigned. All accounts must already exist in Supabase Authentication. Never change `auth.users.role` to a custom application role.
3. Sign in as a teacher. Open **Teacher studio**. A teacher sees only assigned classes; an owner can manage any class.
4. Sign in separately as a student and check that the default course and any published class mission load. Browser tests use a separate local test database, not your live project.

## The lesson format

Every class lesson follows one small format, in both English and Albanian:

- **Name:** a short, friendly title.
- **Explain:** a few simple sentences describing one idea.
- **Show:** one worked example the child can picture.
- **Try:** exactly three small activities.
- **Fly:** a map, a starting energy number, a block limit and any required blocks.

Avoid introducing several new ideas at once. Explain the everyday meaning first, then name the coding word: “remember a number” before “variable”; “do it again” before “loop”. The default 15 lessons use this approach. Their quizzes still check the coding words after introducing them.

## Create or adapt a lesson

Choose a classroom and chapter. Use **Start with an example** to copy a default lesson into a new class-specific lesson, or start with a new lesson. Copying does not overwrite the original course or its exam.

Use the language selector to edit both versions. Draw rocks with **Place rocks**, or switch to **Place the station** to choose the destination. A1 always remains the launch pad. Choose a background, starting energy, block budget and required blocks. Save at any time as a draft; unfinished drafts do not appear to students.

Open **Try this mission**. Build and run a solution using the same blocks students will use. Reaching the station with the required blocks enables publication. The database checks the solution again before accepting publication. This prevents accidentally publishing a blocked or impossible mission.

Click **Publish for my class**. Enrolled students find it under **Class missions**, subject to that chapter being unlocked. These are additional classroom lessons; they do not replace the weekly quizzes or final exam.

## Change a published lesson safely

Editing and saving a draft leaves the previous published version visible. Publish again when the new version has been tested. A fresh published revision gets its own completion mark, so students do not receive credit for a changed mission without trying it. Leaderboard points count each custom lesson once, even if it is republished.

**Move back to drafts** removes the published version from student view. Delete is offered only for unpublished drafts and asks for confirmation. If another teacher has saved the same lesson, reload it before saving; the database rejects stale edits rather than silently overwriting them.

## Flight controls

The ship turns and fires its engines as instructions run. Collecting energy pulses a charging ring. A blocked flight shows a shield impact; arrival opens the station and docks the ship.

Use **Pause**, **Show one step**, **Continue**, **Replay**, **Reset** and the speed selector to explain each action. **Bigger game screen** opens fullscreen where available and an expanded layout otherwise. Click a rock or station for a short explanation. Operating-system reduced-motion settings disable nonessential effects.

The game rewards a correct, tested plan—not fast clicking. Use slow mode to ask the class what they think the ship will do next.
