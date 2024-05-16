# URL Screenshots with Puppeteer and RabbitMQ RPC

This project aims to provide a solution for capturing screenshots of URLs using Puppeteer, a Node library which provides a high-level API over the Chrome DevTools Protocol, and RabbitMQ's Remote Procedure Call (RPC) mechanism for communication.

# Overview

Capturing screenshots of web pages programmatically can be useful for various purposes such as monitoring, testing, or generating previews. This project utilizes Puppeteer to automate the process of opening a web page and taking a screenshot of it. Additionally, RabbitMQ's RPC feature enables communication between different processes, allowing for distributed and scalable architecture.

## Features

URL Capture: Capture screenshots of specified URLs.
Customization: Support for customizing viewport size, screenshot dimensions, and other Puppeteer options.
Asynchronous Processing: Utilize RabbitMQ RPC for asynchronous and distributed processing of screenshot requests.
Scalability: Easily scale the system by adding more workers to handle incoming screenshot requests.
Error Handling: Comprehensive error handling to manage various scenarios such as invalid URLs or network errors.
Logging: Detailed logging to track the status of screenshot requests and system behavior.

# Requirements :

_Node.js_\
_RabbitMQ server_\
_Puppeteer_\
