/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, describe, it, xit, expect, beforeEach, afterEach, waitsFor, waitsForDone, runs, window */
/*unittests: QuickOpen*/

define(function (require, exports, module) {
    'use strict';
    
    var Commands              = require("command/Commands"),
        KeyEvent              = require("utils/KeyEvent"),
        SpecRunnerUtils       = require("spec/SpecRunnerUtils");
    
    describe("QuickOpen", function () {
        var testPath = SpecRunnerUtils.getTestPath("/spec/QuickOpen-test-files");
        var brackets, test$, executeCommand, EditorManager, DocumentManager;

        beforeEach(function () {
        
            runs(function () {
                SpecRunnerUtils.createTestWindowAndRun(this, function (testWindow) {
                    brackets = testWindow.brackets;
                    test$ = testWindow.$;
                    executeCommand = testWindow.executeCommand;
                    EditorManager = brackets.test.EditorManager;
                    DocumentManager = brackets.test.DocumentManager;
                });
            });


        });

        afterEach(function () {
            SpecRunnerUtils.closeTestWindow();
        });
        
        function getSearchBar() {
            return test$(".modal-bar");
        }
        function getSearchField() {
            return test$(".modal-bar input[type='text']");
        }
        
        function expectSearchBarOpen() {
            expect(getSearchBar()[0]).toBeDefined();
        }
        function expectSearchBarClosed() {
            expect(getSearchBar()[0]).not.toBeDefined();
        }
        
        function enterSearchText(str, timeoutLength) {
            timeoutLength = timeoutLength || 10;
            
            expectSearchBarOpen();
            
            window.setTimeout(function () {
                getSearchField().val(str);
            }, timeoutLength);
        }
        
        function pressEnter() {
            expectSearchBarOpen();
            
            // Using keyup here because of inside knowledge of how the events are processed
            // on the QuickOpen input.
            SpecRunnerUtils.simulateKeyEvent(KeyEvent.DOM_VK_RETURN, "keyup", getSearchField()[0]);
        }

        // TODO: fix me!
        // This test is currently turned off due to failures on Windows 7
        // See https://github.com/adobe/brackets/issues/2696
        xit("can open a file and jump to a line, centering that line on the screen", function () {
            var err = false;
            
            SpecRunnerUtils.loadProjectInTestWindow(testPath);
            
            runs(function () {
                var promise = SpecRunnerUtils.openProjectFiles([]);
                waitsForDone(promise, "open project files");
            });
            
            runs(function () {
                executeCommand(Commands.NAVIGATE_QUICK_OPEN);
                
                // need to set the timeout length here to ensure that it has a chance to load the file
                // list.
                enterSearchText("lines", 100);
            });
            
            waitsFor(function () {
                return getSearchField().val() === "lines";
            }, "filename entry timeout", 1000);
            
            runs(function () {
                pressEnter();
            });
            
            waitsFor(function () {
                return EditorManager.getCurrentFullEditor() !== null;
            }, "file opening timeout", 3000);
            
            runs(function () {
                // Make sure we've opened the right file. It should open the longer one, because
                // of the scoring in the StringMatch algorithm.
                expect(DocumentManager.getCurrentDocument().file.name).toEqual("lotsOfLines.html");
                executeCommand(Commands.NAVIGATE_GOTO_LINE);
                enterSearchText(":50");
            });
            
            waitsFor(function () {
                return getSearchField().val() === ":50";
            }, "goto line entry timeout", 1000);
            
            var eventLooped = false;
            runs(function () {
                pressEnter();
                window.setTimeout(function () {
                    eventLooped = true;
                }, 10);
            });
            
            waitsFor(function () { return eventLooped; });
            
            runs(function () {
                var editor = EditorManager.getCurrentFullEditor();
                var scrollPos = editor.getScrollPos();
                
                // The user enters a 1-based number, but the reported position
                // is 0 based, so we check for 49.
                expect(editor).toHaveCursorPosition(49, 0);
                
                // We expect the result to be scrolled roughly to the middle of the window.
                expect(scrollPos.y).toBeGreaterThan(400);
                expect(scrollPos.y).toBeLessThan(500);
            });
        });

    });
});