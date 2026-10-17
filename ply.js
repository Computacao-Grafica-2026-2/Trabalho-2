export function parsePLY(text) {
    const lines = text.trim().split('\n').map((line) => line.trim());
    let vertexCount = 0;
    let faceCount = 0;
    let element = '';
    const properties = [];

    let line = 0;
    while (lines[line] !== 'end_header') {
        const parts = lines[line].split(/\s+/);
        if (parts[0] === 'element') {
            element = parts[1];
            if (element === 'vertex') vertexCount = Number(parts[2]);
            if (element === 'face') faceCount = Number(parts[2]);
        } else if (parts[0] === 'property' && element === 'vertex') {
            properties.push(parts[2]);
        }
        line++;
    }
    line++;

    const x = properties.indexOf('x');
    const y = properties.indexOf('y');
    const z = properties.indexOf('z');

    const vertices = [];
    for (let i = 0; i < vertexCount; i++, line++) {
        const values = lines[line].split(/\s+/).map(Number);
        vertices.push([values[x], values[y], values[z], 1]);
    }

    const indices = [];
    for (let i = 0; i < faceCount; i++, line++) {
        const values = lines[line].split(/\s+/).map(Number);
        indices.push(values[1], values[2], values[3]);
    }

    return { vertices, indices };
}

export async function loadPLY(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Não foi possível carregar ${url} (HTTP ${response.status}).`);
    }
    return parsePLY(await response.text());
}
