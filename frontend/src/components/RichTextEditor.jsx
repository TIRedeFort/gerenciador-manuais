import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Undo,
    Redo,
    Image as ImageIcon
} from 'lucide-react';
import { manualService } from '../services/api';

import { useCallback } from 'react';

function RichTextEditor({ content, onChange }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true
            }),
            Placeholder.configure({
                placeholder: 'Comece a escrever o conteúdo do manual...'
            })
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        }
    });

    const uploadAndInsertImage = useCallback(async (file) => {
        try {
            const formData = new FormData();
            formData.append('imagem', file);

            // Opcional: Mostrar algum loading ou placeholder enquanto carrega

            const response = await manualService.uploadImagem(formData);
            const { url } = response.data;

            // O backend retorna URL relativa (ex: /uploads/images/xyz.jpg)
            // Precisamos garantir que seja acessível. Se estiver no mesmo domínio, ok.
            // Para desenvolvimento local com proxy, o /api prefixo pode atrapalhar se a imagem for estática em raiz
            // O backend configurado serve static em /uploads, então a URL /uploads/... deve funcionar direto na raiz

            editor?.chain().focus().setImage({ src: url }).run();
        } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            alert('Erro ao enviar imagem. Verifique o tamanho ou formato.');
        }
    }, [editor]);

    const addImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                for (const file of files) {
                    await uploadAndInsertImage(file);
                }
            }
        };
        input.click();
    }, [uploadAndInsertImage]);

    // Handle paste for images
    const handlePaste = useCallback((event) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    uploadAndInsertImage(file);
                }
            }
        }
    }, [uploadAndInsertImage]);

    if (!editor) {
        return null;
    }

    return (
        <div className="tiptap-editor" onPaste={handlePaste}>
            <div className="editor-toolbar">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'is-active' : ''}
                    title="Negrito"
                >
                    <Bold size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'is-active' : ''}
                    title="Itálico"
                >
                    <Italic size={18} />
                </button>

                <div className="toolbar-divider" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                    title="Título 1"
                >
                    <Heading1 size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                    title="Título 2"
                >
                    <Heading2 size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                    title="Título 3"
                >
                    <Heading3 size={18} />
                </button>

                <div className="toolbar-divider" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'is-active' : ''}
                    title="Lista"
                >
                    <List size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'is-active' : ''}
                    title="Lista numerada"
                >
                    <ListOrdered size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive('blockquote') ? 'is-active' : ''}
                    title="Citação"
                >
                    <Quote size={18} />
                </button>

                <div className="toolbar-divider" />

                <button
                    type="button"
                    onClick={addImage}
                    title="Inserir imagem"
                >
                    <ImageIcon size={18} />
                </button>

                <div className="toolbar-divider" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Desfazer"
                >
                    <Undo size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Refazer"
                >
                    <Redo size={18} />
                </button>
            </div>

            <EditorContent editor={editor} />

            <style>{`
                .toolbar-divider {
                    width: 1px;
                    height: 24px;
                    background: var(--glass-border);
                    margin: 0 var(--space-2);
                }
            `}</style>
        </div>
    );
}

export default RichTextEditor;
