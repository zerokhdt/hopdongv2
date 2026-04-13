# ACE HRM - Web Development Rules

These rules are MANDATORY for any developer (Human or AI) working on this project.

## 1. Typography & Branding
- **Font**: Always use `Helvetica`.
- **Formatting Synchronization**: 
  - **Bold**: ONLY for Titles and Headings. Avoid bolding body text or labels.
  - **Regular/Normal**: For all body text, descriptions, and standard labels.
  - **Centralized Config**: Use `src/utils/theme.js` for all styling constants (font sizes, colors, radius).
- **Sizes**: Synchronized globally (H1: 4xl, H2: 2xl, Body: sm).

## 2. UI/UX STANDARDS (Premium Aesthetics)
- **Rounded Corners**: Use `rounded-[40px]` for containers and `rounded-[20px]` for interactives.
- **Shadows**: Use `shadow-2xl shadow-slate-200/50`.
- **Layout**: Management features MUST use Table-List view.
- **Micro-interactions**: Use `transition-all`, `hover:-translate-y-1`, and `active:scale-95`.
- **Glassmorphism**: Use for modals and overlays (`backdrop-blur-xl`).

## 3. REFINED WORKFLOW (Recruitment)
1. **Source**: Google Form -> Automatic Sheets sync.
2. **HRM Screen**: Preliminary screening via Position, Skills, and Salary criteria.
3. **Routing Decision**:
   - **Management Position**: HRM conducts direct interviews.
   - **Branch Position**: Candidate sent to Branch Manager.
4. **Interview Deadline**: HRM manually selects a custom deadline when notifying the Branch Manager (typically based on a 5-day SLA guideline).
   - *Auto-reminders*: Generated on day 3 and at the expiry of the chosen deadline.
5. **Rubric System**: Automated scoring based on feedback:
   - 9-10: Expert (Chuyên gia)
   - 7-8: Proficient (Thành thạo)
   - 5-6: Basic (Cơ bản)
6. **SLA Breach**: If process > 5 days -> HRM Escalate -> KPI impact.
7. **Synthesis Review**: HRM reviews using **Split-View** (CV on left, Performance Rubric on right).
8. **Final Decision**: Buttons for "Official Hire" or "Reject" trigger automated professional emails.
9. **Contract Generation**: "Official Hire" auto-generates PDF contract -> Save to HRIS & Cloud storage.
10. **Onboarding**: Sync hired data to Payroll and Training platforms.

## 4. Technical Standards
- **Framework**: React (Vite) + Tailwind CSS.
- **Icons**: `lucide-react` only.
- **Localization**: User Interface must be in **Vietnamese**.
- **Security**: Use `.env` for all secrets. No hardcoded keys.
