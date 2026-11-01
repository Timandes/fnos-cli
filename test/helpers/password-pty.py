"""Exercise Node's real terminal input without contacting a NAS."""
import errno
import os
import pty
import select
import subprocess
import sys
import termios
import time

script = r"""
const { createProgram } = require('./src');
const program = createProgram({
  input: process.stdin, output: process.stderr,
  settings: { acquireServerLock: async () => () => {} },
  createClient: async options => {
    if (options.password !== 'PTY_SECRET') throw new Error('Wrong password');
    process.stdout.write('CLIENT_CREATED\n');
    return { close() {} };
  },
  stdout() {}, stderr: text => process.stderr.write(text + '\n')
});
program.parseAsync(['node', 'fnos', '--lang', 'en', 'login', '-e', 'nas', '-u', 'admin']);
"""
for payload, expected in [(b"PTY_SECRET\r", 0), (b"PTY_SECRET\x03", 130), (b"PTY_SECRET\x04", 4)]:
    master, slave = pty.openpty()
    before = termios.tcgetattr(slave)
    process = subprocess.Popen([sys.argv[1], '-e', script], stdin=slave, stdout=slave, stderr=slave)
    transcript = b''
    sent = False
    deadline = time.monotonic() + 7
    try:
        while time.monotonic() < deadline:
            ready, _, _ = select.select([master], [], [], 0.05)
            if ready:
                try:
                    transcript += os.read(master, 65536)
                except OSError as error:
                    if error.errno != errno.EIO:
                        raise
            if not sent and b'Password: ' in transcript:
                os.write(master, payload)
                sent = True
            if process.poll() is not None:
                break
        assert process.poll() is not None, 'CLI hung after password input'
        assert sent, 'Password prompt did not appear'
        assert process.returncode == expected, (process.returncode, transcript)
        assert b'PTY_SECRET' not in transcript, 'Password was echoed'
        assert (b'CLIENT_CREATED' in transcript) == (expected == 0), transcript
        assert termios.tcgetattr(slave) == before, 'Terminal state was not restored'
    finally:
        if process.poll() is None:
            process.kill()
        process.wait()
        os.close(master)
        os.close(slave)
print('PTY success, Ctrl-C and EOF verified; no password echo; terminal restored')
