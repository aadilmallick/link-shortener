import { bgGreen, bgRed, yellow } from "jsr:@std/internal@^1.0.5/styles";
import { parseArgs } from "jsr:@std/cli@^1.0.8/parse-args";

const args = parseArgs(Deno.args, {
  string: ["name"],
  boolean: ["is_old"],
  default: {
    name: "John",
    is_old: false,
  },
});

console.log(yellow(args.name));
console.log(bgRed(`${args.is_old}`));

const name = prompt("What is your name?");
const isSure = confirm("Are you sure?");

if (isSure) {
  console.log("Yes");
  console.log(name);
} else {
  console.log("No");
  console.log(name);
}
