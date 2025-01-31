clean:
	rm -f code.js

live:
	nodemon --exec "clear; rm -f code.js; bun build code.ts --target browser > code.js" --ext ts

serve:
	bunx serve