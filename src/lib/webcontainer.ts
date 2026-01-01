import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer() {
    if (webcontainerInstance) {
        return webcontainerInstance;
    }

    if (!bootPromise) {
        console.log('[WebContainer] Initiating boot...');
        bootPromise = WebContainer.boot().catch(err => {
            console.error('[WebContainer] Boot failed:', err);
            bootPromise = null;
            throw err;
        });
    }

    try {
        webcontainerInstance = await bootPromise;
        console.log('[WebContainer] Boot successful');
        return webcontainerInstance;
    } catch (err) {
        console.error('[WebContainer] Failed to get instance:', err);
        throw err;
    }
}

/**
 * Converts the builder's file structure to WebContainer's required format
 */
export function transformFilesToWebContainer(files: any[]) {
    const fileTree: any = {};

    files.forEach((file) => {
        const parts = file.path.split('/');
        let current = fileTree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            if (isLast) {
                current[part] = {
                    file: {
                        contents: file.content,
                    },
                };
            } else {
                if (!current[part]) {
                    current[part] = {
                        directory: {},
                    };
                }
                current = current[part].directory;
            }
        }
    });

    // Inject Bolt Inspector Script
    fileTree['bolt-inspector.js'] = {
        file: {
            contents: `
                (function() {
                    let isInspectMode = false;
                    let lastEl = null;

                    window.addEventListener('message', (e) => {
                        if (e.data.type === 'BOLT_SET_INSPECT') {
                            isInspectMode = e.data.enabled;
                            if (!isInspectMode && lastEl) {
                                lastEl.style.outline = 'none';
                            }
                        }
                    });

                    document.addEventListener('mouseover', (e) => {
                        if (!isInspectMode) return;
                        if (lastEl) lastEl.style.outline = 'none';
                        lastEl = e.target;
                        lastEl.style.outline = '2px solid #6366f1';
                        lastEl.style.outlineOffset = '-2px';
                    });

                    document.addEventListener('click', (e) => {
                        if (!isInspectMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        
                        window.parent.postMessage({
                            type: 'BOLT_INSPECT_CLICK',
                            tag: e.target.tagName.toLowerCase(),
                            text: e.target.innerText,
                            classes: e.target.className
                        }, '*');
                    }, true);
                })();
            `
        }
    };

    return fileTree;
}
