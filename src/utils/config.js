const dotenv = require('dotenv');
dotenv.config();

const IGNORE_LIST = [
    '.git',
    '.DS_Store',
    'Thumbs.db',
    '*.tmp',
    '*.log',
    'node_modules',
    '.idea',
    '.env'
];

const ALLOWED_EXTENSIONS = [
    // Text and markup
    '.txt', '.md', '.markdown', '.mdown', '.mkdn', '.mkd', '.tex', '.ltx', '.latex',
    '.rst', '.rest', '.asciidoc', '.adoc', '.asc', '.org', '.textile',
    '.wiki', '.mediawiki', '.creole',
    '.rtf', '.nfo', '.diz',

    // Web development
    '.html', '.htm', '.xhtml', '.shtml', '.css', '.scss', '.sass', '.less',
    '.js', '.jsx', '.ts', '.tsx', '.coffee', '.vue', '.svelte',
    '.php', '.phtml', '.asp', '.aspx', '.jsp', '.jspx', '.cshtml', '.vbhtml',
    '.haml', '.slim', '.jade', '.pug', '.ejs', '.hbs', '.handlebars', '.mustache',
    '.liquid', '.twig',

    // Programming languages
    '.py', '.pyc', '.pyo', '.pyd', '.pyw',  // Python
    '.rb', '.rbw', '.rake', '.gemspec',     // Ruby
    '.java', '.class', '.jar', '.scala', '.sc', '.kt', // JVM
    '.go', '.rs', '.dart',                  // Go, Rust, Dart
    '.c', '.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hh', '.hxx', '.h++', // C/C++
    '.cs', '.csx', '.vb', '.vbs', '.fs', '.fsx', '.f', '.for', '.f90', '.f95', // .NET, VB, F#, Fortran
    '.swift', '.m', '.mm',                  // Swift, Objective-C
    '.pl', '.pm', '.t', '.pod',             // Perl
    '.php', '.phar', '.php3', '.php4', '.php5', '.php7', '.phps', // PHP
    '.lua', '.luac',                        // Lua
    '.sh', '.bash', '.zsh', '.fish',        // Shell
    '.bat', '.cmd', '.ps1', '.psm1', '.psd1', // Windows scripts
    '.tcl', '.exp', '.awk', '.sed',         // Tcl, AWK, sed
    '.js', '.mjs', '.cjs', '.ts', '.coffee',// JavaScript variants
    '.groovy', '.gvy', '.gy', '.gsh',       // Groovy
    '.r', '.rmd',                           // R
    '.jl',                                  // Julia
    '.hs', '.lhs', '.elm',                  // Haskell, Elm
    '.clj', '.cljs', '.cljc', '.edn',       // Clojure
    '.lisp', '.cl', '.l', '.el', '.scm',    // Lisp family
    '.erl', '.hrl', '.ex', '.exs',          // Erlang, Elixir
    '.ml', '.mli', '.fs', '.fsi',           // OCaml, F#
    '.nim', '.nims',                        // Nim
    '.d',                                   // D
    '.pas', '.pp',                          // Pascal
    '.bas',                                 // BASIC
    '.cob', '.cbl',                         // COBOL
    '.asm', '.s',                           // Assembly
    '.v', '.vh', '.sv',                     // Verilog
    '.pde', '.ino',                         // Arduino
    '.sol', '.vy', '.vyper',                // Solidity, Vyper
    '.ahk',                                 // AutoHotkey
    '.applescript',                         // AppleScript
    '.vim', '.vimrc',                       // Vim script

    // Configuration and data
    '.json', '.jsonl', '.geojson', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
    '.properties', '.prop', '.props', '.env',
    '.csv', '.tsv', '.psv',                 // Tabular data
    '.sql', '.sqlite', '.db',               // Databases
    '.plist',                               // Property lists
    '.proto',                               // Protocol Buffers
    '.avsc',                                // Avro schema
    '.thrift',                              // Thrift
    '.wsdl', '.xsd',                        // Web service definitions

    // Document formats
    '.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.md', '.epub',
    '.xls', '.xlsx', '.ods', '.csv', '.tsv',
    '.ppt', '.pptx', '.odp',
    '.pages', '.numbers', '.key',           // Apple iWork

    // Markup and documentation
    '.bib',                                 // BibTeX
    '.srt', '.vtt', '.sub', '.ass',         // Subtitles

    // Version control
    '.gitignore', '.gitattributes', '.gitmodules',
    '.hgignore', '.hgrc',
    '.svnignore',

    // Build and package management
    'Makefile', 'Rakefile', 'Gemfile', 'Gemfile.lock',
    'package.json', 'package-lock.json', 'npm-shrinkwrap.json',
    'yarn.lock', 'bower.json',
    'composer.json', 'composer.lock',
    'requirements.txt', 'Pipfile', 'Pipfile.lock',
    'pom.xml', 'build.gradle', 'build.sbt',
    '.htaccess', '.htpasswd',
    'CMakeLists.txt',
    'Dockerfile', '.dockerignore',
    'Vagrantfile',
    '.travis.yml', '.gitlab-ci.yml', 'appveyor.yml',
    '.eslintrc', '.stylelintrc', '.prettierrc',
    '.editorconfig', '.babelrc',

    // Other formats
    '.log', '.bak', '.temp',
    '.patch', '.diff',
    '.svg',                                 // SVG can contain text/code
    '.gml', '.kml',                         // Geography Markup Languages
    '.reg',                                 // Windows Registry files
    '.strings',                             // Localization strings
    '.po', '.pot',                          // Gettext translation files
    '.desktop',                             // Linux desktop entries
    '.pkgbuild',                            // Arch Linux package build
    '.ebuild',                              // Gentoo Linux ebuilds
    '.spec',                                // RPM spec files
    '.unity',                               // Unity
    '.gd',                                  // Godot
    '.gmx', '.yyp',                         // GameMaker
    '.sfv', '.md5', '.sha1',                // Checksum files
];

const CLAUDE = { // Use env
    baseURL: process.env.API_BASE_URL,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY
};

const MAX_FILE_SIZE = 100 * 1024; // 100 KB

module.exports = {
    IGNORE_LIST,
    ALLOWED_EXTENSIONS,
    CLAUDE,
    MAX_FILE_SIZE
};