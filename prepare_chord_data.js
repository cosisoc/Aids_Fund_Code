// prepare_chord_data.js
// Lädt und verarbeitet die CSV-Daten für das Chord-Diagramm

async function loadAndProcessData() {
    console.log("Lade Daten...");
    
    // CSV-Daten laden
    const data = await d3.csv('/new data/top20000_donor.csv');
    
    // Daten in Zahlen konvertieren
    data.forEach(d => {
        d.Year = +d.Year;
        d.Value = +d.Value;
    });
    
    // Nur Daten aus 2020 filtern
    const data2020 = data.filter(d => d.Year === 2020);
    console.log(`Anzahl Einträge für 2020: ${data2020.length}`);
    
    // Top 10 Donors nach Gesamtsumme berechnen
    const donorSums = d3.rollup(
        data2020,
        v => d3.sum(v, d => d.Value),
        d => d.Donor
    );
    
    const topDonors = Array.from(donorSums)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    console.log("\nTop 10 Donors 2020:");
    topDonors.forEach(([donor, value]) => {
        console.log(`${donor}: ${value.toFixed(2)}`);
    });
    
    const topDonorNames = topDonors.map(d => d[0]);
    
    // Nur Transaktionen mit Top 10 Donors filtern
    const filteredData = data2020.filter(d => topDonorNames.includes(d.Donor));
    
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
    
    console.log("\n✓ Daten wurden erfolgreich verarbeitet!");
    console.log(`Donors: ${donorCount}, Recipients: ${recipientCount}`);
    
    return outputData;
}

// Exportieren für Verwendung in anderen Skripten
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadAndProcessData };
}
