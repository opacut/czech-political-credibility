// App.js
import { useState, useEffect, React} from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, gql } from '@apollo/client';
import './App.css';

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
  const hue = (credibility / 100) * 120;
  return `hsl(${hue}, 100%, 35%)`;
}

function mapValue(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function getHeight(totalEntries) {
  return mapValue(totalEntries, 0, 700, 15, 100);
}

function getWidth(totalEntries) {
  return mapValue(totalEntries, 0, 700, 15, 100);
}

function getHueOld(credibility) {
  let hue;
  if (credibility <= 50) {
    hue = (credibility / 50) * 240;
  } else {
    hue = 240 - ((credibility - 50) / 50) * 240;
  }
  return `hsl(${hue}, 100%, 25%)`;
}

function DisinformationEvents() {
  // Use useQuery hook to fetch data
  const { loading, error, data } = useQuery(GET_DISINFORMATION_DATA);
  //console.log(data);
  //const filteredSpeakers = data.speakers.filter(speaker => speaker.firstName !== "Koalice")
  
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
  //console.log("Filtered speakers: ");
  //console.log(filteredSpeakers);
  
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
      //groups[shortName] = [];
      groups[shortName] = { speakers: [], totalEntries: 0 };
    }
    groups[shortName].speakers.push(speaker);
    groups[shortName].totalEntries += speaker.totalEntries;
    //groups[shortName].push(speaker);
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
  //console.log("Sorted groups");
  //console.log(sortedGroups);

  return (
    <div className="speakers-container group-container">
      {sortedGroups.map(([shortName, speakers, x]) => (
        <div key={shortName} className="box">
          <h3>{shortName}</h3>
            {speakers.map(speaker => (
              <div className="speaker-wrapper" key={speaker.id}>
                <svg key={speaker.id} className="speaker-image" width="100%" height="100%" viewBox="0 0 200 200" fill={getHue(speaker.credibility)}>  
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

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <h1>Důvěryhodnost českých politiků podle serveru demagog.cz</h1>
        <DisinformationEvents />
      </div>
    </ApolloProvider>
  );
}

export default App;
