import { useMemo } from "react";
import { Quote } from "lucide-react";

const QUOTES = [
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Deleted code is debugged code.", author: "Jeff Sickel" },
  { text: "Weeks of coding can save you hours of planning.", author: "Unknown" },
  { text: "It's not a bug — it's an undocumented feature.", author: "Anonymous" },
  { text: "The most disastrous thing that you can ever learn is your first programming language.", author: "Alan Kay" },
  { text: "Programming isn't about what you know; it's about what you can figure out.", author: "Chris Pine" },
  { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
  { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
  { text: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann" },
  { text: "Optimism is an occupational hazard of programming: feedback is the treatment.", author: "Kent Beck" },
  { text: "When to use iterative development? You should use iterative development only on projects that you want to succeed.", author: "Martin Fowler" },
  { text: "Clean code always looks like it was written by someone who cares.", author: "Robert C. Martin" },
  { text: "Every great developer you know got there by solving problems they were unqualified to solve until they actually did it.", author: "Patrick McKenzie" },
  { text: "There are two ways to write error-free programs; only the third one works.", author: "Alan Perlis" },
  { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
  { text: "A language that doesn't affect the way you think about programming is not worth knowing.", author: "Alan Perlis" },
  { text: "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.", author: "Dan Salomon" },
  { text: "Give a man a program, frustrate him for a day. Teach a man to program, frustrate him for a lifetime.", author: "Muhammad Waseem" },
  { text: "Testing leads to failure, and failure leads to understanding.", author: "Burt Rutan" },
  { text: "The computer was born to solve problems that did not exist before.", author: "Bill Gates" },
  { text: "Software is a great combination between artistry and engineering.", author: "Bill Gates" },
  { text: "Confusion is part of programming.", author: "Felienne Hermans" },
];

export default function DevQuote() {
  // Picked once per mount — a fresh quote on every visit to the page
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  return (
    <div
      className="mt-10 p-8 md:p-10 rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)] relative overflow-hidden"
      data-testid="dev-quote"
    >
      <Quote size={64} className="absolute -top-2 -right-2 text-[#c68b73]/[0.08]" aria-hidden="true" />
      <div className="overline-gold mb-4">§ A line for the road</div>
      <blockquote className="font-display-italic text-2xl md:text-[28px] leading-snug text-[#f2ece0]">
        "{quote.text}"
      </blockquote>
      <div className="mt-4 flex items-center gap-3">
        <div className="w-8 h-px bg-[#c68b73]" />
        <cite className="not-italic overline text-[#c68b73]">{quote.author}</cite>
      </div>
    </div>
  );
}
