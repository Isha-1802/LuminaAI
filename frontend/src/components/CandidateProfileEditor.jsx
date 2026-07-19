import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Save, Check, Pencil, X } from "lucide-react";

const GLASS = "rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]";

// ---------------------------------------------------------------------------
// Tech stack catalog — dot colors follow each technology's brand color
// ---------------------------------------------------------------------------
export const TECH_CATALOG = [
  {
    category: "Languages",
    items: [
      ["JavaScript", "#f1e05a"], ["TypeScript", "#3178c6"], ["Python", "#3572A5"], ["Java", "#b07219"],
      ["C++", "#f34b7d"], ["C#", "#178600"], ["C", "#9b9b9b"], ["Go", "#00ADD8"], ["Rust", "#3a3a3a"],
      ["Ruby", "#701516"], ["PHP", "#4F5D95"], ["Swift", "#F05138"], ["Kotlin", "#A97BFF"], ["Dart", "#0175C2"],
      ["Scala", "#c22d40"], ["Elixir", "#6e4a7e"], ["Lua", "#000080"], ["R", "#198CE7"], ["Haskell", "#5e5086"],
      ["Perl", "#0298c3"], ["HTML5", "#e34c26"], ["CSS3", "#563d7c"], ["Sass", "#a53b70"], ["SQL", "#e38c00"],
      ["Bash", "#89e051"], ["Solidity", "#5c5c5c"],
    ],
  },
  {
    category: "Frameworks & Libraries",
    items: [
      ["React", "#61dafb"], ["Next.js", "#1a1a1a"], ["Vue.js", "#41b883"], ["Nuxt", "#00DC82"],
      ["Angular", "#dd0031"], ["Svelte", "#ff3e00"], ["Astro", "#BC52EE"], ["Remix", "#1a1a1a"],
      ["Solid.js", "#2c4f7c"], ["Node.js", "#339933"], ["Deno", "#1a1a1a"], ["Express", "#1a1a1a"],
      ["NestJS", "#e0234e"], ["Django", "#092e20"], ["Flask", "#1a1a1a"], ["FastAPI", "#009688"],
      ["Spring", "#6db33f"], ["Laravel", "#ff2d20"], ["Rails", "#cc0000"], [".NET", "#512bd4"],
      ["Flutter", "#02569B"], ["React Native", "#61dafb"], ["Electron", "#47848f"], ["Tailwind CSS", "#06b6d4"],
      ["Bootstrap", "#7952b3"], ["Vite", "#646cff"], ["jQuery", "#0769ad"], ["Redux", "#764abc"],
      ["GraphQL", "#e10098"], ["PyTorch", "#ee4c2c"], ["TensorFlow", "#ff6f00"], ["pandas", "#150458"],
      ["NumPy", "#013243"],
    ],
  },
  {
    category: "Databases",
    items: [
      ["PostgreSQL", "#336791"], ["MySQL", "#4479A1"], ["MariaDB", "#003545"], ["MongoDB", "#47A248"],
      ["Redis", "#DC382D"], ["SQLite", "#003B57"], ["Firebase", "#FFCA28"], ["Supabase", "#3ECF8E"],
      ["Prisma", "#2D3748"], ["Elasticsearch", "#005571"], ["DynamoDB", "#4053D6"],
    ],
  },
  {
    category: "Cloud & DevOps",
    items: [
      ["AWS", "#FF9900"], ["Azure", "#0078D4"], ["Google Cloud", "#4285F4"], ["Docker", "#2496ED"],
      ["Kubernetes", "#326CE5"], ["Terraform", "#7B42BC"], ["Ansible", "#EE0000"], ["GitHub Actions", "#2088FF"],
      ["Jenkins", "#D24939"], ["Vercel", "#1a1a1a"], ["Netlify", "#00C7B7"], ["Cloudflare", "#F38020"],
      ["Heroku", "#430098"], ["DigitalOcean", "#0080FF"], ["Nginx", "#009639"],
    ],
  },
  {
    category: "Tools",
    items: [
      ["Git", "#F05032"], ["GitHub", "#1a1a1a"], ["GitLab", "#FC6D26"], ["VS Code", "#007ACC"],
      ["Neovim", "#57A143"], ["IntelliJ IDEA", "#1a1a1a"], ["Figma", "#F24E1E"], ["Postman", "#FF6C37"],
      ["Linux", "#FCC624"], ["Vim", "#019733"], ["Jira", "#0052CC"], ["Notion", "#1a1a1a"],
      ["Slack", "#4A154B"], ["Webpack", "#8DD6F9"], ["Vitest", "#6E9F18"], ["Jest", "#C21325"],
    ],
  },
];

const TECH_COLOR = Object.fromEntries(TECH_CATALOG.flatMap((c) => c.items));

export const CONNECT_PLATFORMS = [
  { id: "linkedin", letter: "L", color: "#0A66C2", label: "LinkedIn", placeholder: "LinkedIn URL or handle", build: (v) => (v.startsWith("http") ? v : `https://linkedin.com/in/${v}`) },
  { id: "twitter", letter: "X", color: "#0f0f0f", label: "X / Twitter", placeholder: "X / Twitter handle", build: (v) => (v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/, "")}`) },
  { id: "instagram", letter: "I", color: "#d6456b", label: "Instagram", placeholder: "Instagram username", build: (v) => (v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`) },
  { id: "tiktok", letter: "T", color: "#0f0f0f", label: "TikTok", placeholder: "TikTok username", build: (v) => (v.startsWith("http") ? v : `https://tiktok.com/@${v.replace(/^@/, "")}`) },
  { id: "youtube", letter: "Y", color: "#FF0000", label: "YouTube", placeholder: "YouTube channel URL", build: (v) => (v.startsWith("http") ? v : `https://youtube.com/@${v.replace(/^@/, "")}`) },
  { id: "pinterest", letter: "P", color: "#BD081C", label: "Pinterest", placeholder: "Pinterest username", build: (v) => (v.startsWith("http") ? v : `https://pinterest.com/${v}`) },
  { id: "devto", letter: "D", color: "#0f0f0f", label: "Dev.to", placeholder: "Dev.to username", build: (v) => (v.startsWith("http") ? v : `https://dev.to/${v}`) },
  { id: "website", letter: "W", color: "#4a76ee", label: "Website", placeholder: "Website URL", build: (v) => (v.startsWith("http") ? v : `https://${v}`) },
  { id: "email", letter: "E", color: "#e05d44", label: "Email", placeholder: "Email address", build: (v) => `mailto:${v}` },
];

export const ABOUT_PROMPTS = [
  { id: "working_on", emoji: "🔭", label: "Currently working on" },
  { id: "learning", emoji: "🌱", label: "Currently learning" },
  { id: "collaborate", emoji: "👯", label: "Looking to collaborate on" },
  { id: "help_with", emoji: "🤔", label: "Looking for help with" },
  { id: "ask_me", emoji: "💬", label: "Ask me about" },
  { id: "pronouns", emoji: "😄", label: "Pronouns" },
  { id: "fun_fact", emoji: "⚡", label: "Fun fact" },
];

const pictureSrc = (user) =>
  user.picture
    ? user.picture.startsWith("http")
      ? user.picture
      : `${process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"}${user.picture}`
    : null;

// README-style sentence prefixes for the profile view
const ABOUT_SENTENCES = {
  working_on: "I'm currently working on",
  learning: "I'm currently learning",
  collaborate: "I'm looking to collaborate on",
  help_with: "I'm looking for help with",
  ask_me: "Ask me about",
  pronouns: "Pronouns:",
  fun_fact: "Fun fact:",
};

// Pick dark or light text against a badge's brand color
const badgeTextColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const luma = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 150 ? "#0c0a09" : "#ffffff";
};

function TechChip({ name, color, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm border transition-all duration-300 ${
        selected
          ? "border-[#c68b73] bg-[#c68b73]/[0.12] text-[#f2ece0]"
          : "border-[#f2ece0]/[0.1] bg-[#f2ece0]/[0.03] text-[#a8a094] hover:border-[#f2ece0]/25 hover:text-[#f2ece0]"
      }`}
      data-testid={`tech-chip-${name}`}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {name}
      {selected && <Check size={13} className="text-[#c68b73]" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// View mode — the saved profile, showing only what was chosen
// ---------------------------------------------------------------------------
function ProfileView({ user, name, bio, stack, connect, aboutSections, onEdit }) {
  const filledConnect = CONNECT_PLATFORMS.filter((p) => (connect[p.id] || "").trim());
  const filledAbout = ABOUT_PROMPTS.filter((p) => (aboutSections[p.id] || "").trim());
  const src = pictureSrc(user);

  return (
    <div className={`p-8 md:p-12 ${GLASS}`} data-testid="candidate-profile-view">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex items-center gap-6 min-w-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1a1714] border border-[#c68b73]/30 flex items-center justify-center shrink-0">
            {src ? (
              <img src={src} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#c68b73] font-display text-4xl">{name?.charAt(0) || user.email?.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-4xl md:text-5xl tracking-[-0.02em] truncate" data-testid="profile-view-name">
              {name || "Unnamed"}
            </h2>
            {bio && <p className="mt-3 text-[#a8a094] leading-relaxed max-w-xl" data-testid="profile-view-bio">{bio}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 inline-flex items-center gap-2 border border-[#f2ece0]/20 px-4 py-2.5 text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:border-[#c68b73] hover:text-[#c68b73] transition-colors"
          data-testid="edit-profile-btn"
        >
          <Pencil size={11} /> Edit
        </button>
      </div>

      {filledAbout.length > 0 && (
        <div className="pt-8 border-t border-[#f2ece0]/[0.08]">
          <div className="overline-gold mb-5">§ About</div>
          <div className="space-y-3.5">
            {filledAbout.map((p) => (
              <div key={p.id} className="text-[15px] md:text-[17px] leading-relaxed text-[#b8b0a2]">
                <span className="mr-2">{p.emoji}</span>
                {ABOUT_SENTENCES[p.id]}{" "}
                <span className="font-semibold text-[#f2ece0]">{aboutSections[p.id]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stack.length > 0 && (
        <div className="mt-8 pt-8 border-t border-[#f2ece0]/[0.08]">
          <div className="overline-gold mb-5">§ Tech Stack</div>
          <div className="flex flex-wrap gap-2.5">
            {stack.map((t) => {
              const bg = TECH_COLOR[t] || "#c68b73";
              return (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] border border-white/10"
                  style={{ background: bg, color: badgeTextColor(bg) }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {filledConnect.length > 0 && (
        <div className="mt-8 pt-8 border-t border-[#f2ece0]/[0.08]">
          <div className="overline-gold mb-5">§ Connect With Me</div>
          <div className="flex flex-wrap gap-2.5">
            {filledConnect.map((p) => (
              <a
                key={p.id}
                href={p.build(connect[p.id].trim())}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] border border-white/10 hover:scale-105 transition-transform"
                style={{ background: p.color, color: badgeTextColor(p.color) }}
                title={p.label}
                data-testid={`profile-view-connect-${p.id}`}
              >
                {p.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {!bio && stack.length === 0 && filledConnect.length === 0 && filledAbout.length === 0 && (
        <div className="pt-8 border-t border-[#f2ece0]/[0.08] text-sm text-[#6b6459]">
          Your profile is empty — press Edit to build it.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
export default function CandidateProfileEditor({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [stack, setStack] = useState([]);
  const [connect, setConnect] = useState({});
  const [aboutSections, setAboutSections] = useState({});

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setBio(user.about || "");
    setStack(user.tech_stack || []);
    setConnect(user.connect || {});
    setAboutSections(user.about_sections || {});
    const empty =
      !(user.about || "").trim() &&
      !(user.tech_stack || []).length &&
      !Object.values(user.connect || {}).some((v) => (v || "").trim()) &&
      !Object.values(user.about_sections || {}).some((v) => (v || "").trim());
    if (empty) setEditing(true);
  }, [user]);

  const toggleTech = (t) =>
    setStack((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cleanConnect = Object.fromEntries(
        Object.entries(connect).filter(([, v]) => v && v.trim())
      );
      const cleanAbout = Object.fromEntries(
        Object.entries(aboutSections).filter(([, v]) => v && v.trim())
      );
      const { data } = await api.put("/profiles/me", {
        name: name || null,
        about: bio || null,
        tech_stack: stack,
        connect: cleanConnect,
        about_sections: cleanAbout,
      });
      onSaved?.(data);
      setEditing(false);
      toast.success("Profile saved");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0]?.msg : detail || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/profiles/me/picture", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved?.(data);
      toast.success("Picture updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) return null;

  if (!editing) {
    return (
      <ProfileView
        user={user}
        name={name}
        bio={bio}
        stack={stack}
        connect={connect}
        aboutSections={aboutSections}
        onEdit={() => setEditing(true)}
      />
    );
  }

  const src = pictureSrc(user);

  return (
    <form onSubmit={onSubmit} className="space-y-10" data-testid="candidate-profile-editor">
      <div className="flex items-center justify-between">
        <div className="overline text-[#a8a094]">Editing your profile</div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#f2ece0] transition-colors"
          data-testid="cancel-edit-btn"
        >
          <X size={12} /> Cancel
        </button>
      </div>

      {/* ------------------------------------------------ Identity + Bio */}
      <div className={`p-8 md:p-10 ${GLASS}`}>
        <div className="overline-gold mb-2">§ Identity — 01</div>
        <h2 className="font-display text-3xl tracking-tight mb-8">Who you are</h2>
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1a1714] border border-[#c68b73]/30 flex items-center justify-center shrink-0">
            {src ? (
              <img src={src} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#c68b73] font-display text-3xl">{user.name?.charAt(0) || user.email?.charAt(0)}</span>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePictureUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPic}
            className="text-[10px] uppercase tracking-[0.28em] border border-[#f2ece0]/20 px-4 py-2.5 hover:border-[#c68b73] hover:text-[#c68b73] transition-colors"
          >
            {uploadingPic ? "Uploading…" : "Change picture"}
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="overline">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
              placeholder="Your name"
              data-testid="profile-name-input"
            />
          </div>
          <div>
            <label className="overline">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={1000}
              className="mt-2 w-full bg-[#0c0a09]/60 border border-[#f2ece0]/[0.1] rounded-xl px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors resize-none"
              placeholder="A few lines about you — who you are, what you build, what you're after…"
              data-testid="profile-bio-input"
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ Tech stack */}
      <div className={`p-8 md:p-10 ${GLASS}`}>
        <div className="overline-gold mb-2">§ Tech Stack — 02</div>
        <h2 className="font-display text-3xl tracking-tight">What you work with</h2>
        <p className="text-sm text-[#a8a094] mt-2 mb-8">
          Pick your tools. Only what you select appears on your profile.
        </p>
        <div className="space-y-10">
          {TECH_CATALOG.map((cat) => {
            const count = cat.items.filter(([n]) => stack.includes(n)).length;
            return (
              <div key={cat.category}>
                <div className="flex items-baseline justify-between mb-4">
                  <span className="overline text-[#f2ece0]/80">{cat.category}</span>
                  <span className="overline text-[#c68b73]">{count} selected</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {cat.items.map(([tech, color]) => (
                    <TechChip
                      key={tech}
                      name={tech}
                      color={color}
                      selected={stack.includes(tech)}
                      onToggle={() => toggleTech(tech)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------ Connect */}
      <div className={`p-8 md:p-10 ${GLASS}`}>
        <div className="overline-gold mb-2">§ Connect — 03</div>
        <h2 className="font-display text-3xl tracking-tight">Where to find you</h2>
        <p className="text-sm text-[#a8a094] mt-2 mb-8">
          Enter just a handle — the full link is built for you. Empty rows stay off your profile.
        </p>
        <div className="space-y-3">
          {CONNECT_PLATFORMS.map((p) => (
            <div key={p.id} className="flex items-center gap-4">
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 border border-white/10"
                style={{ background: p.color }}
              >
                {p.letter}
              </span>
              <input
                type="text"
                value={connect[p.id] || ""}
                onChange={(e) => setConnect({ ...connect, [p.id]: e.target.value })}
                className="flex-1 bg-[#0c0a09]/60 border border-[#f2ece0]/[0.1] rounded-xl px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors"
                placeholder={p.placeholder}
                data-testid={`connect-${p.id}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ About you */}
      <div className={`p-8 md:p-10 ${GLASS}`}>
        <div className="overline-gold mb-2">§ About You — 04</div>
        <h2 className="font-display text-3xl tracking-tight">Say only what you want</h2>
        <p className="text-sm text-[#a8a094] mt-2 mb-8">
          Every line is optional. Filled lines appear on your profile; empty ones don't.
        </p>
        <div className="space-y-4">
          {ABOUT_PROMPTS.map((p) => (
            <div key={p.id}>
              <label className="text-sm text-[#f2ece0]/90">
                {p.emoji} <span className="font-medium">{p.label}</span>
                <span className="text-[#6b6459] text-xs ml-2 font-mono">optional</span>
              </label>
              <input
                type="text"
                value={aboutSections[p.id] || ""}
                onChange={(e) => setAboutSections({ ...aboutSections, [p.id]: e.target.value })}
                className="mt-2 w-full bg-[#0c0a09]/60 border border-[#f2ece0]/[0.1] rounded-xl px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors"
                placeholder={p.label + "…"}
                data-testid={`about-${p.id}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all disabled:opacity-50"
          data-testid="save-profile-btn"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Profile
        </button>
      </div>
    </form>
  );
}
