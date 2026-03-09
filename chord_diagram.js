// chord_diagram.js
// Hauptskript für die Chord-Diagramm Visualisierung

let processedData = null;
let allData = null; // Speichert alle geladenen Daten
let currentYear = 2020; // Aktuelles Jahr
let selectedDonorIndex = null; // Für Highlighting im Hauptdiagramm
let selectedDonorName = null; // Name des ausgewählten Donors - GLOBAL

// Tracking für die drei kleinen Diagramme
let selectedCountries = ['United States', 'Germany', 'Japan']; // Initial ausgewählte Länder
const MAX_SELECTIONS = 3; // Maximal 3 Länder kombiniert aus Donors und Recipients

// Daten laden und verarbeiten
async function loadAndProcessData(year = 2020) {
    console.log(`Lade Daten für Jahr ${year}...`);
    
    // CSV-Daten nur einmal laden, wenn noch nicht geladen
    if (!allData) {
        console.log("Lade CSV-Daten...");
        allData = await d3.csv('new data/top20000_donor.csv');
        
        // Daten in Zahlen konvertieren
        allData.forEach(d => {
            d.Year = +d.Year;
            d.Value = +d.Value;
        });
    }
    
    // Nur Daten aus dem gewählten Jahr filtern
    const yearData = allData.filter(d => d.Year === year);
    console.log(`Anzahl Einträge für ${year}: ${yearData.length}`);
    
    // Top 10 Donors nach Gesamtsumme berechnen
    const donorSums = d3.rollup(
        yearData,
        v => d3.sum(v, d => d.Value),
        d => d.Donor
    );
    
    const topDonors = Array.from(donorSums)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    console.log(`\nTop 10 Donors ${year}:`);
    topDonors.forEach(([donor, value]) => {
        console.log(`${donor}: ${value.toFixed(2)}`);
    });
    
    const topDonorNames = topDonors.map(d => d[0]);
    
    // Nur Transaktionen mit Top 10 Donors filtern
    const filteredData = yearData.filter(d => topDonorNames.includes(d.Donor));
    
    // Recipients aggregieren
    const recipientSums = d3.rollup(
        filteredData,
        v => d3.sum(v, d => d.Value),
        d => d.Recipient
    );
    
    const recipients = Array.from(recipientSums)
        .sort((a, b) => b[1] - a[1]);
    
    console.log(`\nAnzahl Recipients: ${recipients.length}`);
    console.log("\nTop 10 Recipients:");
    recipients.slice(0, 10).forEach(([recipient, value]) => {
        console.log(`${recipient}: ${value.toFixed(2)}`);
    });
    
    const recipientNames = recipients.map(d => d[0]);
    
    // Matrix für Chord-Diagramm erstellen
    const donorCount = topDonorNames.length;
    const recipientCount = recipientNames.length;
    const nodeCount = donorCount + recipientCount;
    
    // Matrix initialisieren (quadratisch)
    const matrix = Array(nodeCount).fill(0).map(() => Array(nodeCount).fill(0));
    
    // Matrix füllen
    filteredData.forEach(row => {
        const donor = row.Donor;
        const recipient = row.Recipient;
        const value = row.Value;
        
        if (topDonorNames.includes(donor) && recipientNames.includes(recipient)) {
            const donorIdx = topDonorNames.indexOf(donor);
            const recipientIdx = donorCount + recipientNames.indexOf(recipient);
            
            // Verbindung von Donor zu Recipient
            matrix[donorIdx][recipientIdx] += value;
            // Auch die umgekehrte Richtung für korrekte Bögen-Breite
            matrix[recipientIdx][donorIdx] += value;
        }
    });
    
    // Daten für D3.js vorbereiten
    const outputData = {
        nodes: [
            ...topDonorNames.map(name => ({ name, type: 'donor' })),
            ...recipientNames.map(name => ({ name, type: 'recipient' }))
        ],
        matrix: matrix,
        donor_count: donorCount,
        recipient_count: recipientCount
    };
    
    // Wenn ein Donor ausgewählt war, Index wiederherstellen
    if (selectedDonorName) {
        const newIndex = outputData.nodes.findIndex(n => n.name === selectedDonorName && n.type === 'donor');
        if (newIndex !== -1 && newIndex < donorCount) {
            selectedDonorIndex = newIndex;
            console.log(`✓ Auswahl wiederhergestellt: ${selectedDonorName} (Index ${newIndex})`);
        } else {
            // Donor ist nicht mehr in Top 10
            console.log(`⚠ ${selectedDonorName} ist nicht mehr in Top 10`);
            selectedDonorIndex = null;
            selectedDonorName = null;
        }
    }
    
    console.log("\n✓ Daten wurden erfolgreich verarbeitet!");
    console.log(`Donors: ${donorCount}, Recipients: ${recipientCount}`);
    
    return outputData;
}

// Daten für ein einzelnes Donor-Land verarbeiten
async function loadSingleDonorData(donorName, year = 2020) {
    console.log(`Lade Daten für ${donorName} (${year})...`);
    
    // CSV-Daten nur einmal laden, wenn noch nicht geladen
    if (!allData) {
        console.log("Lade CSV-Daten...");
        allData = await d3.csv('new data/top20000_donor.csv');
        allData.forEach(d => {
            d.Year = +d.Year;
            d.Value = +d.Value;
        });
    }
    
    // Nur Daten für diesen Donor und Jahr filtern
    const donorData = allData.filter(d => d.Year === year && d.Donor === donorName);
    
    if (donorData.length === 0) {
        console.log(`Keine Daten für ${donorName} in ${year}`);
        return null;
    }
    
    // Recipients nach Gesamtsumme aggregieren und sortieren
    const recipientSums = d3.rollup(
        donorData,
        v => d3.sum(v, d => d.Value),
        d => d.Recipient
    );
    
    // Top Recipients nehmen (sortiert nach Betrag)
    const topRecipients = Array.from(recipientSums)
        .sort((a, b) => b[1] - a[1]) // Nach Betrag sortieren (absteigend)
        .slice(0, 50) // Nur Top 50 Recipients nehmen
        .map(d => d[0]); // Nur Namen extrahieren
    
    console.log(`Top 5 Recipients für ${donorName} in ${year}:`, 
                Array.from(recipientSums)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, value]) => `${name}: ${value.toFixed(2)}`));
    
    // Nur Daten für Top Recipients behalten
    const filteredDonorData = donorData.filter(d => topRecipients.includes(d.Recipient));
    
    const recipientCount = topRecipients.length;
    const totalNodes = 1 + recipientCount; // 1 Donor + Recipients
    
    // Matrix erstellen (quadratisch: totalNodes × totalNodes)
    const matrix = Array(totalNodes).fill(0).map(() => Array(totalNodes).fill(0));
    
    filteredDonorData.forEach(d => {
        const recipientIdx = topRecipients.indexOf(d.Recipient);
        if (recipientIdx !== -1) {
            // Donor (Index 0) → Recipient (Index recipientIdx + 1)
            matrix[0][recipientIdx + 1] += d.Value;
            matrix[recipientIdx + 1][0] += d.Value; // Symmetrisch für bessere Darstellung
        }
    });
    
    return {
        nodes: [
            { name: donorName, type: 'donor' },
            ...topRecipients.map(name => ({ name, type: 'recipient' }))
        ],
        matrix: matrix,
        donor_count: 1,
        recipient_count: recipientCount,
        donor_name: donorName
    };
}

// Daten für ein einzelnes Recipient-Land verarbeiten
async function loadSingleRecipientData(recipientName, year = 2020) {
    console.log(`Lade Daten für Recipient ${recipientName} (${year})...`);
    
    // CSV-Daten nur einmal laden, wenn noch nicht geladen
    if (!allData) {
        console.log("Lade CSV-Daten...");
        allData = await d3.csv('new data/top20000_donor.csv');
        allData.forEach(d => {
            d.Year = +d.Year;
            d.Value = +d.Value;
        });
    }
    
    // Nur Daten für diesen Recipient und Jahr filtern
    const recipientData = allData.filter(d => d.Year === year && d.Recipient === recipientName);
    
    if (recipientData.length === 0) {
        console.log(`Keine Daten für ${recipientName} in ${year}`);
        return null;
    }
    
    // Donors nach Gesamtsumme aggregieren und sortieren
    const donorSums = d3.rollup(
        recipientData,
        v => d3.sum(v, d => d.Value),
        d => d.Donor
    );
    
    // Top Donors nehmen (sortiert nach Betrag)
    const topDonors = Array.from(donorSums)
        .sort((a, b) => b[1] - a[1]) // Nach Betrag sortieren (absteigend)
        .slice(0, 50) // Nur Top 50 Donors nehmen
        .map(d => d[0]); // Nur Namen extrahieren
    
    console.log(`Top 5 Donors für ${recipientName} in ${year}:`, 
                Array.from(donorSums)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, value]) => `${name}: ${value.toFixed(2)}`));
    
    // Nur Daten für Top Donors behalten
    const filteredRecipientData = recipientData.filter(d => topDonors.includes(d.Donor));
    
    const donorCount = topDonors.length;
    const totalNodes = donorCount + 1; // Donors + 1 Recipient
    
    // Matrix erstellen (quadratisch: totalNodes × totalNodes)
    const matrix = Array(totalNodes).fill(0).map(() => Array(totalNodes).fill(0));
    
    filteredRecipientData.forEach(d => {
        const donorIdx = topDonors.indexOf(d.Donor);
        if (donorIdx !== -1) {
            // Donor (Index donorIdx) → Recipient (Index totalNodes - 1, letzter)
            matrix[donorIdx][totalNodes - 1] += d.Value;
            matrix[totalNodes - 1][donorIdx] += d.Value; // Symmetrisch
        }
    });
    
    return {
        nodes: [
            ...topDonors.map(name => ({ name, type: 'donor' })),
            { name: recipientName, type: 'recipient' }
        ],
        matrix: matrix,
        donor_count: donorCount,
        recipient_count: 1,
        recipient_name: recipientName
    };
}

function createChordDiagram(data) {
    const width = 750;
    const height = 750;
    const outerRadius = Math.min(width, height) * 0.42;
    const innerRadius = outerRadius - 30;

    // Funktion zum Kürzen von Ländernamen
    function shortenCountryName(name) {
        const replacements = {
            "China (People's Republic of)": "China",
            "Syrian Arab Republic": "Syria",
            "Democratic Republic of the Congo": "Dem. Rep. Congo",
            "Viet Nam": "Vietnam",
            "Côte d'Ivoire": "Ivory Coast",
            "Dominican Republic": "Dominican Rep.",
            "Marshall Islands": "Marshall Isl.",
            "Wallis and Futuna": "Wallis & Futuna",
            "United States": "USA",
            "United Kingdom": "UK",
            "United Arab Emirates": "UAE",
            "Asian Development Bank [AsDB]": "AsDB",
            "New Zealand": "New Zealand",
            "African Dev. Fund": "African Fund",
            "Lao People's Democratic Republic": "Laos",
            "Turks and Caicos Islands": "Turks & Caicos",
            "British Virgin Islands": "Brit. Virgin Isl.",
            "Bosnia and Herzegovina": "Bosnia & Herz."
        };
        
        return replacements[name] || name;
    }

    // Berechne die Gesamtsummen für Recipients für die Balken
    const recipientTotals = [];
    for (let i = data.donor_count; i < data.nodes.length; i++) {
        let total = 0;
        for (let j = 0; j < data.donor_count; j++) {
            total += data.matrix[j][i];
        }
        recipientTotals.push({
            index: i,
            name: data.nodes[i].name,
            total: total
        });
    }
    
    // Finde maximalen Wert für Skalierung
    const maxRecipientValue = d3.max(recipientTotals, d => d.total);
    console.log("Max recipient value:", maxRecipientValue);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Hauptgruppe mit Rotation erstellen (180° drehen, sodass Donors unten sind)
    const mainGroup = svg.append("g")
        .attr("transform", "rotate(20)");

    // Farbskalen
    // Türkis-Farbpalette für Donors (von hell nach dunkel)
    const donorColor = d3.scaleOrdinal()
        .domain(d3.range(data.donor_count))
        .range([
            "#B2F5EA", // Sehr helles Türkis
            "#81E6D9", // Helles Türkis
            "#4FD1C5", // Mittel-helles Türkis
            "#38B2AC", // Mittleres Türkis
            "#319795", // Mittel-dunkles Türkis
            "#2C7A7B", // Dunkles Türkis
            "#285E61", // Sehr dunkles Türkis
            "#234E52", // Noch dunkler
            "#1D4044", // Am dunkelsten
            "#1A3638"  // Dunkelster Türkis
        ]);
    
    const recipientColor = d3.scaleOrdinal()
        .domain(d3.range(data.recipient_count))
        .range([
            "#7C2D12", // Dunkelorange/Braun
            "#9A3412", // Sehr dunkles Orange
            "#C2410C", // Dunkles Orange
            "#EA580C", // Mittel-dunkles Orange
            "#F97316", // Mittleres Orange
            "#FB923C", // Mittel-helles Orange
            "#FDBA74", // Helles Orange
            "#FED7AA", // Sehr helles Orange/Pfirsich
            "#FFEDD5"  // Beige (statt weiß)
        ]);

    // Radien für die Balken - deutlich größer und weiter außen
    const barInnerRadius = outerRadius + 95; // Weiter außen (von 20 auf 35)
    const barMaxLength = 200; // Maximale Balkenlänge deutlich erhöht (von 150 auf 200)
    const barScale = d3.scaleLinear()
        .domain([0, maxRecipientValue])
        .range([10, barMaxLength]); // Mindestlänge von 10px für bessere Sichtbarkeit

    // Chord Layout erstellen
    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

    const chords = chord(data.matrix);

    // Arc Generator für die Gruppen
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    // Ribbon Generator für die Verbindungen
    const ribbon = d3.ribbon()
        .radius(innerRadius);

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Gruppen (Länder) zeichnen
    const group = mainGroup.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");

    group.append("path")
        .attr("class", "group-arc")
        .attr("d", arc)
        .attr("fill", d => {
            if (d.index < data.donor_count) {
                return donorColor(d.index);
            } else {
                return recipientColor(d.index - data.donor_count);
            }
        })
        .attr("fill-opacity", d => {
            // Sofort richtige Opacity setzen
            if (selectedDonorIndex !== null) {
                if (d.index === selectedDonorIndex) {
                    return 1;
                }
                const isConnected = chords.some(chord => 
                    (chord.source.index === selectedDonorIndex && chord.target.index === d.index) ||
                    (chord.target.index === selectedDonorIndex && chord.source.index === d.index)
                );
                return isConnected ? 1 : 0.1;
            }
            return 1; // Default: voll sichtbar
        })
        .attr("stroke", "#fff") // Stroke hinzufügen
        .attr("stroke-width", 2) // Stroke-Width hinzufügen
        .attr("stroke-opacity", d => {
            // Sofort richtige Opacity setzen
            if (selectedDonorIndex !== null) {
                if (d.index === selectedDonorIndex) {
                    return 1;
                }
                const isConnected = chords.some(chord => 
                    (chord.source.index === selectedDonorIndex && chord.target.index === d.index) ||
                    (chord.target.index === selectedDonorIndex && chord.source.index === d.index)
                );
                return isConnected ? 1 : 0.1;
            }
            return 1;
        })
        .classed("selected", d => selectedDonorIndex !== null && d.index === selectedDonorIndex)
        .style("cursor", d => d.index < data.donor_count ? "pointer" : "default")
        .on("mouseover", function(event, d) {
            const node = data.nodes[d.index];
            const total = d.value / 1000; // CSV ist in Tausend, wir zeigen Millionen
            
            // Bogen hervorheben mit Scale-Effekt
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius + 8)) // 8px größer
                .style("filter", "brightness(1.2)");
            
            tooltip
                .style("opacity", 1)
                .html(`<strong>${node.name}</strong><br/>
                       ${node.type === 'donor' ? 'Amount paid' : 'Amount received'}: 
                       $${total.toFixed(2)}M`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            // Nur zurücksetzen wenn nicht ausgewählt
            if (!d3.select(this).classed("selected")) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("d", arc) // Zurück zur normalen Größe
                    .style("filter", "brightness(1)");
            }
            
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            // Nur für Donor-Länder reagieren
            if (d.index < data.donor_count) {
                event.stopPropagation();
                
                // Check ob dieses Land bereits ausgewählt ist
                if (selectedDonorIndex === d.index) {
                    // Deselektieren
                    selectedDonorIndex = null;
                    selectedDonorName = null;
                    resetHighlight();
                } else {
                    // Neues Land auswählen
                    selectedDonorIndex = d.index;
                    selectedDonorName = data.nodes[d.index].name;
                    highlightDonor(d.index);
                }
            }
        });

    // Labels für Gruppen
    group.append("text")
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", "0.35em")
        .attr("class", d => {
            return d.index < data.donor_count ? "group-label donor-label" : "group-label recipient-label";
        })
        .attr("transform", d => {
            const angle = d.angle * 180 / Math.PI - 90;
            const radius = outerRadius + 30; // MEHR Abstand zum Kreis (von 25 auf 30)
            if (angle > 90 && angle < 270) {
                return `rotate(${angle}) translate(${radius},0) rotate(180)`;
            } else {
                return `rotate(${angle}) translate(${radius},0)`;
            }
        })
        .attr("text-anchor", d => {
            const angle = d.angle * 180 / Math.PI - 90;
            return (angle > 90 && angle < 270) ? "end" : "start";
        })
        .attr("font-size", "20px") // ← HIER: von 18px auf 20px ändern
        .attr("font-weight", "700")
        .text(d => shortenCountryName(data.nodes[d.index].name))
        .attr("fill-opacity", 1)
        .style("cursor", d => d.index < data.donor_count ? "pointer" : "default")
        .on("click", function(event, d) {
            if (d.index < data.donor_count) {
                event.stopPropagation();
                
                if (selectedDonorIndex === d.index) {
                    selectedDonorIndex = null;
                    selectedDonorName = null;
                    resetHighlight();
                } else {
                    selectedDonorIndex = d.index;
                    selectedDonorName = data.nodes[d.index].name;
                    highlightDonor(d.index);
                }
            }
        });

    // Chords (Verbindungen) zeichnen
    const chordPaths = mainGroup.append("g")
        .attr("fill-opacity", 0.4) // Container opacity
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("class", "chord")
        .attr("d", ribbon)
        .attr("fill", d => {
            // Farbe basierend auf Donor
            if (d.source.index < data.donor_count) {
                return donorColor(d.source.index);
            } else {
                return recipientColor(d.source.index - data.donor_count);
            }
        })
        .attr("fill-opacity", 0.4) // WICHTIG: 0.4 statt 1!
        .attr("stroke", "none")
        .on("mouseover", function(event, d) {
            const source = data.nodes[d.source.index];
            const target = data.nodes[d.target.index];
            const value = d.source.value / 1000; // CSV ist in Tausend, wir zeigen Millionen
            
            // Herausfinden welcher Donor ist
            const donor = source.type === 'donor' ? source.name : target.name;
            const recipient = source.type === 'recipient' ? source.name : target.name;
            
            tooltip
                .style("opacity", 1)
                .html(`<strong>${donor}</strong> → <strong>${recipient}</strong><br/>
                       Amount: $${value.toFixed(2)}M`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            event.stopPropagation();
            
            // Herausfinden welcher der Donor ist
            const donorIndex = d.source.index < data.donor_count ? d.source.index : d.target.index;
            
            // Check ob dieses Land bereits ausgewählt ist
            if (selectedDonorIndex === donorIndex) {
                // Deselektieren
                selectedDonorIndex = null;
                selectedDonorName = null;
                resetHighlight();
            } else {
                // Neues Land auswählen
                selectedDonorIndex = donorIndex;
                selectedDonorName = data.nodes[donorIndex].name;
                highlightDonor(donorIndex);
            }
        });

    // Funktion zum Hervorheben aller Chords eines Donors
    function highlightDonor(donorIndex) {
        // Alle Chords abdunkeln
        chordPaths
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.05);
        
        // Alle Chords des ausgewählten Donors hervorheben
        chordPaths
            .filter(d => d.source.index === donorIndex || d.target.index === donorIndex)
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.8);
        
        // Alle Bögen (Länder) abdunkeln
        group.selectAll("path.group-arc")
            .classed("selected", false)
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.1)
            .attr("stroke-opacity", 0.1);
        
        // Alle Labels abdunkeln
        group.selectAll("text")
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.1);
        
        // Den ausgewählten Donor hervorheben
        group.selectAll("path.group-arc")
            .filter(g => g.index === donorIndex)
            .classed("selected", true)
            .transition()
            .duration(300)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
        
        // Donor Label hervorheben
        group.selectAll("text")
            .filter(g => g.index === donorIndex)
            .transition()
            .duration(300)
            .attr("fill-opacity", 1);
        
        // Alle verbundenen Recipients hervorheben
        const connectedRecipients = new Set();
        chordPaths
            .filter(d => d.source.index === donorIndex || d.target.index === donorIndex)
            .each(d => {
                const recipientIndex = d.source.index === donorIndex ? d.target.index : d.source.index;
                connectedRecipients.add(recipientIndex);
            });
        
        // Recipients-Bögen hervorheben
        group.selectAll("path.group-arc")
            .filter(g => connectedRecipients.has(g.index))
            .transition()
            .duration(300)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
        
        // Recipients-Labels hervorheben
        group.selectAll("text")
            .filter(g => connectedRecipients.has(g.index))
            .transition()
            .duration(300)
            .attr("fill-opacity", 1);
    }

    // Alte highlightChord Funktion nicht mehr benötigt - entfernen
    // Funktion zum Hervorheben eines Chords
    function highlightChord(chordData, clickedElement) {
        // Alle Chords abdunkeln
        chordPaths
            .classed("selected", false)
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.05);
        
        // Ausgewählten Chord hervorheben
        d3.select(clickedElement)
            .classed("selected", true)
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.8);
        
        // Alle Bögen (Länder) abdunkeln
        group.selectAll("path.group-arc")
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.2);
        
        // Alle Labels abdunkeln
        group.selectAll("text")
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.3);
        
        // Die beiden beteiligten Länder hervorheben
        group.selectAll("path.group-arc")
            .filter((g) => g.index === chordData.source.index || g.index === chordData.target.index)
            .transition()
            .duration(300)
            .attr("fill-opacity", 1);
        
        // Die beiden beteiligten Labels hervorheben
        group.selectAll("text")
            .filter((g) => g.index === chordData.source.index || g.index === chordData.target.index)
            .transition()
            .duration(300)
            .attr("fill-opacity", 1);
    }

    // Funktion zum Zurücksetzen
    function resetHighlight() {
        // selectedDonorIndex wird NICHT hier zurückgesetzt, sondern nur beim Click
        
        // Alle Chords zurücksetzen
        chordPaths
            .transition()
            .duration(300)
            .attr("fill-opacity", 0.4);
        
        // Alle Bögen zurücksetzen (inkl. stroke-opacity!)
        group.selectAll("path.group-arc")
            .classed("selected", false)
            .transition()
            .duration(300)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
        
        // Alle Labels zurücksetzen
        group.selectAll("text")
            .transition()
            .duration(300)
            .attr("fill-opacity", 1);
    }

    // Click auf SVG zum Zurücksetzen
    svg.on("click", function() {
        selectedDonorIndex = null;
        selectedDonorName = null;
        resetHighlight();
    });
    
    // WICHTIG: Highlight SOFORT wiederherstellen wenn ein Land ausgewählt war
    if (selectedDonorIndex !== null && selectedDonorIndex < data.donor_count) {
        console.log(`✓ Stelle Highlight SOFORT wieder her für Index ${selectedDonorIndex} (${data.nodes[selectedDonorIndex].name})`);
        
        // OHNE setTimeout - direkt anwenden!
        // UND: Ohne Transition - sofort setzen!
        
        // Alle Chords abdunkeln - OHNE TRANSITION
        chordPaths
            .attr("fill-opacity", d => {
                const isConnected = d.source.index === selectedDonorIndex || d.target.index === selectedDonorIndex;
                return isConnected ? 0.8 : 0.05;
            });
        
        // Alle Bögen abdunkeln - OHNE TRANSITION
        group.selectAll("path.group-arc")
            .classed("selected", d => d.index === selectedDonorIndex)
            .attr("fill-opacity", d => {
                if (d.index === selectedDonorIndex) return 1;
                const isConnected = chords.some(chord => 
                    (chord.source.index === selectedDonorIndex && chord.target.index === d.index) ||
                    (chord.target.index === selectedDonorIndex && chord.source.index === d.index)
                );
                return isConnected ? 1 : 0.1;
            })
            .attr("stroke-opacity", d => {
                if (d.index === selectedDonorIndex) return 1;
                const isConnected = chords.some(chord => 
                    (chord.source.index === selectedDonorIndex && chord.target.index === d.index) ||
                    (chord.target.index === selectedDonorIndex && chord.source.index === d.index)
                );
                return isConnected ? 1 : 0.1;
            });
        
        // Alle Labels abdunkeln - OHNE TRANSITION
        group.selectAll("text")
            .attr("fill-opacity", d => {
                if (d.index === selectedDonorIndex) return 1;
                const isConnected = chords.some(chord => 
                    (chord.source.index === selectedDonorIndex && chord.target.index === d.index) ||
                    (chord.target.index === selectedDonorIndex && chord.source.index === d.index)
                );
                return isConnected ? 1 : 0.1;
            });
    }
}

// Funktion für kleine Chord-Diagramme (vereinfacht, mit Tooltip)
function createSmallChordDiagram(data, containerId) {
    // Bestehenden Inhalt löschen
    d3.select(containerId).selectAll('*').remove();
    
    // Wenn keine Daten vorhanden, "No Data" Platzhalter anzeigen
    if (!data) {
        const width = 160;
        const height = 160;
        
        const svg = d3.select(containerId)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height]);
        
        // Grauer Kreis
        svg.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 80)
            .attr("fill", "#2a2a2a")
            .attr("stroke", "#444444")
            .attr("stroke-width", 2);
        
        // "No Data" Text
        svg.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#888888")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .text("NO DATA");
        
        return;
    }
    
    const width = 160;
    const height = 160;
    const outerRadius = Math.min(width, height) * 0.4;
    const innerRadius = outerRadius - 14;
    
    const svg = d3.select(containerId)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);
    
    // Chord Layout
    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);
    
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
    
    const ribbon = d3.ribbon()
        .radius(innerRadius);
    
    const chords = chord(data.matrix);
    
    // Farben - unterschiedlich für Donor- vs. Recipient-Diagramme
    const donorColor = "#38B2AC"; // Einzelner Türkis-Ton für Donor-Diagramme
    const donorColors = d3.scaleOrdinal()
        .domain(d3.range(data.donor_count))
        .range([
            "#B2F5EA", "#81E6D9", "#4FD1C5", "#38B2AC", "#319795",
            "#2C7A7B", "#285E61", "#234E52", "#1D4044", "#1A3638"
        ]);
    
    const recipientColors = d3.scaleOrdinal()
        .domain(d3.range(data.recipient_count))
        .range([
            "#7C2D12", "#9A3412", "#C2410C", "#EA580C",
            "#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#FFEDD5"
        ]);
    
    // Tooltip
    const tooltip = d3.select("#tooltip");
    
    const group = svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");
    
    // Bögen zeichnen
    group.append("path")
        .attr("d", arc)
        .attr("fill", d => {
            // Wenn nur 1 Donor (Donor-Diagramm): Nutze eine einzige Türkis-Farbe
            if (data.donor_count === 1) {
                if (d.index === 0) {
                    return donorColor;
                } else {
                    return recipientColors(d.index - 1);
                }
            } 
            // Wenn mehrere Donors (Recipient-Diagramm): Nutze verschiedene Türkis-Töne
            else {
                if (d.index < data.donor_count) {
                    return donorColors(d.index);
                } else {
                    return recipientColors(d.index - data.donor_count);
                }
            }
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            const node = data.nodes[d.index];
            const total = d.value / 1000; // CSV ist in Tausend, wir zeigen Millionen
            
            // Bogen größer machen
            d3.select(this)
                .transition()
                .duration(150)
                .attr("d", d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius + 5)) // 5px größer für kleine Diagramme
                .style("filter", "brightness(1.2)");
            
            tooltip
                .style("opacity", 1)
                .html(`<strong>${node.name}</strong><br/>
                       ${node.type === 'donor' ? 'Amount paid' : 'Amount received'}: 
                       $${total.toFixed(2)}M`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            // Zurücksetzen
            d3.select(this)
                .transition()
                .duration(150)
                .attr("d", arc) // Zurück zur normalen Größe
                .style("filter", "brightness(1)");
            
            tooltip.style("opacity", 0);
        });
    
    // Chords zeichnen
    svg.append("g")
        .attr("fill-opacity", 0.5)
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("d", ribbon)
        .attr("fill", d => {
            // Bei Donor-Diagrammen (nur 1 Donor): Recipients-Farben verwenden
            if (data.donor_count === 1) {
                return recipientColors(d.target.index - 1);
            }
            // Bei Recipient-Diagrammen (mehrere Donors): Donors-Farben verwenden
            else {
                if (d.source.index < data.donor_count) {
                    return donorColors(d.source.index);
                } else {
                    return recipientColors(d.source.index - data.donor_count);
                }
            }
        })
        .attr("stroke", "none")
        .on("mouseover", function(event, d) {
            const sourceName = data.nodes[d.source.index].name;
            const targetName = data.nodes[d.target.index].name;
            const value = d.source.value / 1000; // CSV ist in Tausend, wir zeigen Millionen
            tooltip
                .style("opacity", 1)
                .html(`<strong>${sourceName}</strong> → <strong>${targetName}</strong><br/>
                       Amount: $${value.toFixed(2)}M`);
            d3.select(this)
                .attr("fill-opacity", 0.8);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            d3.select(this)
                .attr("fill-opacity", 0.5);
        });
}

// Dropdown-Funktionalität für Donors
function populateDonorsDropdown(processedData) {
    const donorsList = document.getElementById('donors-list');
    
    // Wenn keine processedData, zeige zumindest die ausgewählten Länder an
    if (!processedData) {
        donorsList.innerHTML = selectedCountries
            .filter(country => {
                // Nur Donors aus selectedCountries anzeigen
                // (wir können nicht unterscheiden, also alle anzeigen)
                return true;
            })
            .map(country => {
                return `<div class="dropdown-item selected" 
                             data-country="${country}" 
                             data-type="donor">
                            ${country}
                        </div>`;
            }).join('');
        
        setupDropdownItemClicks('donors');
        return;
    }
    
    const top10Donors = processedData.nodes.slice(0, 10); // Erste 10 sind Donors
    
    // Donors in zwei Gruppen aufteilen: ausgewählt und nicht ausgewählt
    const selectedDonors = [];
    const unselectedDonors = [];
    
    // Alle Top 10 Donors durchgehen
    top10Donors.forEach((donor, index) => {
        const donorData = {
            donor: donor,
            index: index,
            isSelected: selectedCountries.includes(donor.name),
            isDisabled: !selectedCountries.includes(donor.name) && selectedCountries.length >= MAX_SELECTIONS
        };
        
        if (donorData.isSelected) {
            selectedDonors.push(donorData);
        } else {
            unselectedDonors.push(donorData);
        }
    });
    
    // Zusätzlich: Ausgewählte Länder, die nicht in den Top 10 sind (z.B. wegen Jahr-Wechsel)
    selectedCountries.forEach(country => {
        const isInTop10 = top10Donors.some(d => d.name === country);
        if (!isInTop10) {
            // Prüfen ob es ein Donor ist (nicht in Recipients)
            const isRecipient = processedData.nodes.slice(10).some(r => r.name === country);
            if (!isRecipient) {
                // Es ist ein Donor, aber nicht mehr in Top 10
                selectedDonors.push({
                    donor: { name: country, type: 'donor' },
                    index: -1, // Kein Index, da nicht in Top 10
                    isSelected: true,
                    isDisabled: false
                });
            }
        }
    });
    
    // Kombinierte Liste: Erst ausgewählte, dann nicht ausgewählte
    const sortedDonors = [...selectedDonors, ...unselectedDonors];
    
    donorsList.innerHTML = sortedDonors.map(({donor, index, isSelected, isDisabled}) => {
        return `<div class="dropdown-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
                     data-country="${donor.name}" 
                     data-type="donor"
                     data-index="${index}">
                    ${donor.name}
                </div>`;
    }).join('');
    
    // Click-Events für Dropdown-Items hinzufügen
    setupDropdownItemClicks('donors');
}

// Dropdown-Funktionalität für Recipients
function populateRecipientsDropdown(processedData) {
    const recipientsList = document.getElementById('recipients-list');
    
    // Wenn keine processedData, zeige zumindest die ausgewählten Länder an
    if (!processedData) {
        recipientsList.innerHTML = selectedCountries
            .filter(country => {
                // Nur Recipients aus selectedCountries anzeigen
                return true;
            })
            .map(country => {
                return `<div class="dropdown-item selected" 
                             data-country="${country}" 
                             data-type="recipient">
                            ${country}
                        </div>`;
            }).join('');
        
        setupDropdownItemClicks('recipients');
        return;
    }
    
    const recipients = processedData.nodes.slice(10); // Ab Index 10 sind Recipients
    
    // Recipients in zwei Gruppen aufteilen: ausgewählt und nicht ausgewählt
    const selectedRecipients = [];
    const unselectedRecipients = [];
    
    // Alle Recipients durchgehen
    recipients.forEach((recipient, index) => {
        const recipientData = {
            recipient: recipient,
            index: index,
            isSelected: selectedCountries.includes(recipient.name),
            isDisabled: !selectedCountries.includes(recipient.name) && selectedCountries.length >= MAX_SELECTIONS
        };
        
        if (recipientData.isSelected) {
            selectedRecipients.push(recipientData);
        } else {
            unselectedRecipients.push(recipientData);
        }
    });
    
    // Zusätzlich: Ausgewählte Länder, die nicht in der aktuellen Recipients-Liste sind
    selectedCountries.forEach(country => {
        const isInRecipients = recipients.some(r => r.name === country);
        if (!isInRecipients) {
            // Prüfen ob es ein Recipient ist (nicht in Donors)
            const isDonor = processedData.nodes.slice(0, 10).some(d => d.name === country);
            if (!isDonor) {
                // Es ist ein Recipient, aber nicht in der aktuellen Liste
                selectedRecipients.push({
                    recipient: { name: country, type: 'recipient' },
                    index: -1,
                    isSelected: true,
                    isDisabled: false
                });
            }
        }
    });
    
    // Kombinierte Liste: Erst ausgewählte, dann nicht ausgewählte
    const sortedRecipients = [...selectedRecipients, ...unselectedRecipients];
    
    recipientsList.innerHTML = sortedRecipients.map(({recipient, index, isSelected, isDisabled}) => {
        return `<div class="dropdown-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
                     data-country="${recipient.name}" 
                     data-type="recipient"
                     data-index="${index}">
                    ${recipient.name}
                </div>`;
    }).join('');
    
    // Click-Events für Dropdown-Items hinzufügen
    setupDropdownItemClicks('recipients');
}

// Click-Events für Dropdown-Items
function setupDropdownItemClicks(type) {
    const listId = type === 'donors' ? '#donors-list' : '#recipients-list';
    const items = document.querySelectorAll(`${listId} .dropdown-item`);
    
    items.forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            
            const country = this.getAttribute('data-country');
            
            if (this.classList.contains('selected')) {
                // Land abwählen
                const index = selectedCountries.indexOf(country);
                if (index > -1) {
                    selectedCountries.splice(index, 1);
                }
            } else {
                // Land auswählen (nur wenn weniger als MAX_SELECTIONS)
                if (selectedCountries.length < MAX_SELECTIONS) {
                    selectedCountries.push(country);
                }
            }
            
            // Kleine Diagramme aktualisieren
            updateSmallDiagrams();
            
            // BEIDE Dropdowns neu rendern (wegen der kombinierten Limit)
            populateDonorsDropdown(processedData);
            populateRecipientsDropdown(processedData);
        });
    });
}

// Kleine Diagramme basierend auf selectedCountries aktualisieren
async function updateSmallDiagrams() {
    const chartIds = ['#chart-usa', '#chart-germany', '#chart-japan'];
    const titleIds = ['#title-chart-1', '#title-chart-2', '#title-chart-3'];
    
    // Alle Charts leeren und Titel aktualisieren
    chartIds.forEach((id, index) => {
        d3.select(id).selectAll('*').remove();
        
        // Titel aktualisieren oder leeren
        const titleElement = document.querySelector(titleIds[index]);
        if (selectedCountries[index]) {
            titleElement.textContent = selectedCountries[index];
            titleElement.style.display = 'block';
        } else {
            titleElement.textContent = '';
            titleElement.style.display = 'none';
        }
    });
    
    // Neue Charts für ausgewählte Länder erstellen
    for (let i = 0; i < selectedCountries.length && i < 3; i++) {
        const country = selectedCountries[i];
        
        // Prüfen ob es ein Donor oder Recipient ist
        const isDonor = processedData.nodes.slice(0, 10).some(n => n.name === country);
        
        let data;
        try {
            if (isDonor) {
                data = await loadSingleDonorData(country, currentYear);
            } else {
                data = await loadSingleRecipientData(country, currentYear);
            }
            
            // Chart erstellen - auch wenn data null ist (dann wird "No Data" angezeigt)
            createSmallChordDiagram(data, chartIds[i]);
        } catch (error) {
            console.error(`Fehler beim Laden von ${country}:`, error);
            // Bei Fehler auch "No Data" anzeigen
            createSmallChordDiagram(null, chartIds[i]);
        }
    }
}

// Dropdown Toggle für beide Dropdowns
function setupDropdowns() {
    // Donors Dropdown
    const donorsClickArea = document.getElementById('donors-clickarea');
    const donorsList = document.getElementById('donors-list');
    const recipientsList = document.getElementById('recipients-list');
    const donorsContainer = document.getElementById('donors-dropdown-container');
    const recipientsContainer = document.getElementById('recipients-dropdown-container');
    
    // Sicherstellen, dass beide Container immer sichtbar sind
    donorsContainer.style.display = 'flex';
    recipientsContainer.style.display = 'flex';
    
    donorsClickArea.addEventListener('click', function() {
        const isOpen = donorsList.style.display === 'block';
        
        // Donors-Liste toggle
        donorsList.style.display = isOpen ? 'none' : 'block';
        
        // Recipients-Container nach unten verschieben wenn Donors offen ist
        if (!isOpen) {
            // Donors wird geöffnet - Recipients nach unten verschieben (200px für die Dropdown-Höhe)
            recipientsContainer.style.marginTop = '200px';
            recipientsList.style.display = 'none';
        } else {
            // Donors wird geschlossen - Recipients zurück nach oben
            recipientsContainer.style.marginTop = '0';
        }
        
        // Container sichtbar halten
        donorsContainer.style.display = 'flex';
        recipientsContainer.style.display = 'flex';
    });
    
    // Recipients Dropdown
    const recipientsClickArea = document.getElementById('recipients-clickarea');
    
    recipientsClickArea.addEventListener('click', function() {
        const isOpen = recipientsList.style.display === 'block';
        
        // Recipients-Liste toggle
        recipientsList.style.display = isOpen ? 'none' : 'block';
        
        // Donors-Liste schließen wenn Recipients geöffnet wird
        if (!isOpen) {
            donorsList.style.display = 'none';
            // Recipients wird geöffnet - marginTop zurücksetzen
            recipientsContainer.style.marginTop = '0';
        }
        
        // Container sichtbar halten
        donorsContainer.style.display = 'flex';
        recipientsContainer.style.display = 'flex';
    });
}

// Beim Laden der Seite
(async function init() {
    try {
        processedData = await loadAndProcessData(currentYear);
        
        // Hauptdiagramm erstellen
        createChordDiagram(processedData);
        
        // Beide Dropdowns befüllen
        populateDonorsDropdown(processedData);
        populateRecipientsDropdown(processedData);
        setupDropdowns();
        
        // Kleine Diagramme basierend auf selectedCountries erstellen
        await updateSmallDiagrams();
        
        // Timeline Event-Listener hinzufügen
        const yearSlider = document.getElementById('year-slider');
        const currentYearDisplay = document.getElementById('current-year');
        const titleYearDisplay = document.getElementById('title-year');
        
        let updateTimeout = null;
        let isUpdating = false;
        
        yearSlider.addEventListener('input', async function(e) {
            const newYear = parseInt(e.target.value);
            currentYearDisplay.textContent = newYear;
            titleYearDisplay.textContent = newYear;
            
            // Wenn gerade ein Update läuft, abbrechen
            if (isUpdating) {
                clearTimeout(updateTimeout);
            }
            
            // Debouncing: Nach 150ms ohne weitere Bewegung aktualisieren
            updateTimeout = setTimeout(async () => {
                if (currentYear !== newYear) {
                    isUpdating = true;
                    currentYear = newYear;
                    console.log(`Jahr geändert zu: ${currentYear}`);
                    
                    // WICHTIG: selectedDonorName merken BEVOR wir Daten neu laden
                    const previouslySelectedDonor = selectedDonorName;
                    console.log(`Vorher ausgewähltes Land: ${previouslySelectedDonor}`);
                    
                    try {
                        // Hauptdiagramm neu laden
                        processedData = await loadAndProcessData(currentYear);
                        d3.select('#chart').selectAll('*').remove();
                        createChordDiagram(processedData);
                        
                        // Beide Dropdowns aktualisieren
                        populateDonorsDropdown(processedData);
                        populateRecipientsDropdown(processedData);
                        
                        // Kleine Diagramme neu laden
                        await updateSmallDiagrams();
                        
                        console.log(`Nach Jahr-Wechsel: selectedDonorIndex=${selectedDonorIndex}, selectedDonorName=${selectedDonorName}`);
                    } catch (error) {
                        console.error("Fehler beim Aktualisieren:", error);
                    } finally {
                        isUpdating = false;
                    }
                }
            }, 150);
        });

        // Keyboard support: allow arrow keys, page up/down and home/end to control the slider
        yearSlider.addEventListener('keydown', function(e) {
            console.debug('slider keydown:', e.key);
            const step = parseInt(yearSlider.step) || 1;
            const min = parseInt(yearSlider.min);
            const max = parseInt(yearSlider.max);
            let value = parseInt(yearSlider.value);

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowDown':
                    value = Math.max(min, value - step);
                    break;
                case 'ArrowRight':
                case 'ArrowUp':
                    value = Math.min(max, value + step);
                    break;
                case 'PageDown':
                    value = Math.max(min, value - Math.max(1, step * 10));
                    break;
                case 'PageUp':
                    value = Math.min(max, value + Math.max(1, step * 10));
                    break;
                case 'Home':
                    value = min;
                    break;
                case 'End':
                    value = max;
                    break;
                default:
                    return; // ignore other keys
            }

            // Prevent page scrolling when adjusting with keys
            e.preventDefault();

            // Update slider value and trigger input handler
            yearSlider.value = value;
            const inputEvent = new Event('input', { bubbles: true });
            yearSlider.dispatchEvent(inputEvent);
        });

        // Global fallback: if the slider is NOT focused, allow arrow/page/home/end to control it
        document.addEventListener('keydown', function(e) {
            console.debug('document keydown:', e.key);
            // Ignore when user is typing in an input/textarea or contenteditable
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            // If slider itself is focused, the slider listener handles keys already
            if (active === yearSlider) return;

            const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'];
            if (!keys.includes(e.key)) return;

            const step = parseInt(yearSlider.step) || 1;
            const min = parseInt(yearSlider.min);
            const max = parseInt(yearSlider.max);
            let value = parseInt(yearSlider.value);

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowDown':
                    value = Math.max(min, value - step);
                    break;
                case 'ArrowRight':
                case 'ArrowUp':
                    value = Math.min(max, value + step);
                    break;
                case 'PageDown':
                    value = Math.max(min, value - Math.max(1, step * 10));
                    break;
                case 'PageUp':
                    value = Math.min(max, value + Math.max(1, step * 10));
                    break;
                case 'Home':
                    value = min;
                    break;
                case 'End':
                    value = max;
                    break;
            }

            e.preventDefault();
            yearSlider.value = value;
            yearSlider.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Also attach to window as a fallback in case document-level events are intercepted
        window.addEventListener('keydown', function(e) {
            console.debug('window keydown:', e.key);
            // Skip if the focused element is an input/textarea/contenteditable
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            if (active === yearSlider) return; // already handled by slider keydown

            const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'];
            if (!keys.includes(e.key)) return;

            const step = parseInt(yearSlider.step) || 1;
            const min = parseInt(yearSlider.min);
            const max = parseInt(yearSlider.max);
            let value = parseInt(yearSlider.value);

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowDown':
                    value = Math.max(min, value - step);
                    break;
                case 'ArrowRight':
                case 'ArrowUp':
                    value = Math.min(max, value + step);
                    break;
                case 'PageDown':
                    value = Math.max(min, value - Math.max(1, step * 10));
                    break;
                case 'PageUp':
                    value = Math.min(max, value + Math.max(1, step * 10));
                    break;
                case 'Home':
                    value = min;
                    break;
                case 'End':
                    value = max;
                    break;
            }

            e.preventDefault();
            yearSlider.value = value;
            yearSlider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
    }
})();
