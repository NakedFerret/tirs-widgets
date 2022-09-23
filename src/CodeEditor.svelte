<script>
    import 'bytemd/dist/index.css'
    import { Editor, Viewer } from "bytemd";
    import gfm from "@bytemd/plugin-gfm";

    let value;
    const plugins = [
        gfm(),
        // Add more plugins here
    ];

    function handleChange(e) {
        value = e.detail.value;
    }
</script>

<Editor {value} {plugins} on:change={handleChange} />
