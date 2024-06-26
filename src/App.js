import { useState, useEffect, React} from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, gql } from '@apollo/client';
import './App.css';
import SliderStatementsCutoff from './sliderStatementsCutoff.js';

// Define your GraphQL query
const GET_DISINFORMATION_DATA = gql`
  query GetDisinformationData {
    speakers(limit: 1000) {
      id
      firstName
      lastName
      body {
        shortName
        name
      }
      stats {
        true
        untrue
      }
    }
  }
`;

function getHue(credibility) {
  //const hue = (credibility / 100) * 120;
  //return `hsl(${hue}, 100%, 35%)`;
  if (credibility > 90){
    return "#4fff0f";
  }
  if (credibility > 75){
    return "#e7ff0f";
  }
  if (credibility > 50){
    return "#ff8b0f";
  }
  return "#f11313";
}

//function DisinformationEvents() {
const DisinformationEvents = ({ statementsCutoff }) => {
  // Use useQuery hook to fetch data
  const { loading, error, data } = useQuery(GET_DISINFORMATION_DATA);
  
  // tooltip handling
  const [tooltipLeft, setTooltipLeft] = useState(false);
  useEffect(() => {
    const handleTooltipPosition = () => {
      const tooltips = document.querySelectorAll('.tooltip');
      tooltips.forEach(tooltip => {
        const rect = tooltip.getBoundingClientRect();
        const isLeft = rect.left < 100; // Check if tooltip is off-screen to the left
        setTooltipLeft(isLeft);
      });
    };

    window.addEventListener('resize', handleTooltipPosition);
    handleTooltipPosition(); // Call initially to set tooltip position
    return () => {
      window.removeEventListener('resize', handleTooltipPosition);
    };
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  var filteredSpeakers = data.speakers.filter(speaker => speaker.firstName !== 'Koalice');
  filteredSpeakers = filteredSpeakers.filter(speaker => speaker.body !== null);
  
  // Add a new field "totalEntries" to each speaker object
  const speakersWithTotalEntries = filteredSpeakers.map(speaker => ({
    ...speaker,
    totalEntries: speaker.stats.true + speaker.stats.untrue
  }));
  
  // Filter out the speakers with no entries
  const onlySpeakersWithEntries = speakersWithTotalEntries.filter(speaker => (
    speaker.totalEntries > 0
  ));

  // Add a new field "credibility" to each speaker object
  const speakersWithCredibility = onlySpeakersWithEntries.map(speaker => ({
    ...speaker,
    credibility: Math.round(speaker.stats.true / speaker.totalEntries * 100)
  }));
  console.log("Speakers with credibility: ");
  console.log(speakersWithCredibility);

  // put speakers in groups
  const groupedSpeakers = speakersWithCredibility.reduce((groups, speaker) => {
    const shortName = speaker.body.name;
    if (!groups[shortName]) {
      groups[shortName] = { speakers: [], totalEntries: 0 };
    }
    groups[shortName].speakers.push(speaker);
    groups[shortName].totalEntries += speaker.totalEntries;
    return groups;
  }, {});

  // Sort groups by the total value of entries in speaker.stats
  const sortedGroups = Object.entries(groupedSpeakers).sort(([shortNameA, groupA], [shortNameB, groupB]) => {
    return groupB.totalEntries - groupA.totalEntries; // Sort in descending order based on totalEntries
  }).map(([shortName, group]) => {
    // Sort speakers within each group by the total number of entries in stats
    const sortedSpeakers = group.speakers.sort((speakerA, speakerB) => {
      return speakerB.totalEntries - speakerA.totalEntries; // Sort in descending order based on totalEntries
    });

    return [shortName, sortedSpeakers, group.totalEntries];
  });

  return (
    <div className="speakers-container group-container">
      {sortedGroups.map(([shortName, speakers, x]) => (
        <div key={shortName} className="box">
          <h3>{shortName}</h3>
            {speakers.map(speaker => (
              speaker.totalEntries > statementsCutoff ? (
              <div className="speaker-wrapper" key={speaker.id}>
                <svg key={speaker.id} className="speaker-image" width="100%" height="100%" viewBox="0 0 200 200" fill={speaker.totalEntries < parseInt(statementsCutoff) ? "grey" : getHue(speaker.credibility)}>  
                  <g transform="matrix(0.1,0,0,-0.1,0,200)">
                    <path d="M915,1871C821,1847 744,1782 701,1691C664,1611 664,1507 703,1428C802,1225 1069,1183 1220,1346C1281,1413 1304,1470 1304,1560C1305,1685 1247,1782 1139,1840C1090,1866 1062,1874 1011,1876C975,1878 932,1876 915,1871Z"/>
                    <path d="M893,1112C821,1086 765,1045 730,992C703,951 670,865 670,835C670,829 710,680 759,505C808,329 853,166 859,143L871,100L990,100C1094,100 1109,102 1114,118C1117,127 1162,291 1215,481C1305,807 1310,831 1300,875C1294,901 1281,939 1270,961C1203,1090 1029,1161 893,1112Z"/>
                  </g>
                </svg>
                <div className={`tooltip ${tooltipLeft ? 'left' : ''}`}>
                  <strong>{speaker.firstName} {speaker.lastName}</strong>
                  <p>Pravda: {speaker.stats.true}</p>
                  <p>Nepravda: {speaker.stats.untrue}</p>
                  <p>Důvěryhodnost: {speaker.credibility}%</p>
                </div>
              </div>
              ) : null
            ))}
        </div>
      ))}
    </div>
  );
}

// Create an ApolloClient instance
const client = new ApolloClient({
  uri: 'https://demagog.cz/graphql', // Example endpoint, replace this with your GraphQL endpoint
  cache: new InMemoryCache()
});

const App = () => {
// minimum statements slider
  const [statementsCutoff, setStatementsCutoff] = useState(0);

  const handleStatementsCutoffChange = (newValue) => {
    setStatementsCutoff(newValue);
  };

  return (
    <ApolloProvider client={client}>
      <div className="App">
        <h1>Důvěryhodnost českých politiků podle serveru demagog.cz</h1>
        <p><strong>Legenda:</strong></p>
        <p>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect width="20" height="20" style={{ fill: "#4fff0f" }} />
          </svg>
          Důvěryhodnost nad 90%
        </p>
        <p>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect width="20" height="20" style={{ fill: "#e7ff0f" }} />
          </svg>
          Důvěryhodnost nad 75%
        </p>
        <p>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect width="20" height="20" style={{ fill: "#ff8b0f" }} />
          </svg>
          Důvěryhodnost nad 50%
        </p>
        <p>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect width="20" height="20" style={{ fill: "#f11313" }} />
          </svg>
          Důvěryhodnost pod 50%
        </p>
        <SliderStatementsCutoff statementsCutoff={statementsCutoff} onStatementsCutoffChange={handleStatementsCutoffChange} />
        <DisinformationEvents statementsCutoff={statementsCutoff} />
      </div>
    </ApolloProvider>
  );
}


export default App;
