import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import express , {Response,Request, Router} from "express";
import axios from "axios";
import { authMiddleware } from "../middlewares/authmidd";
import sharp from 'sharp';
const router = express.Router();
enum Status {
  Success = 200,
  NotFound = 404,
  ServerError = 500,
  BadRequest = 400
}  


function latLonToTile(lat:number, lon : number, zoom : number) {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor(
        (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
    );
    return { x, y };
}


/// this route is for the offline map purposes
router.get("/maps/:place",authMiddleware,async(req:Request,res:Response)=>{
  const id  = req.id;
  const place = req.params.place
  const zoom:number=12;
  const findu = await prisma.user.findFirst({
    where:{
        id
    }
  })

  if(!findu){
    return res.status(Status.NotFound).json({
        msg:"not a valid user"
    })
  }

  const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${place}&format=json&limit=1&polygon_geojson=1&addressdetails=1`,{
    headers:{
        "User-Agent": "MyTrekApp/1.0 (kunalsharmahp07@gmail.com)"
    }
  });

  const bbox = response.data[0].boundingbox;
  const north = parseFloat(bbox[1]);
  const south = parseFloat(bbox[0]);
  const east = parseFloat(bbox[3]);
  const west = parseFloat(bbox[2]);

  const  nw = latLonToTile(north,west,zoom);
  const se = latLonToTile(south,east,zoom);
  

  const tileWidth = 256;
        const tileHeight = 256;
        const width = (se.x - nw.x + 1) * tileWidth;
        const height = (se.y - nw.y + 1) * tileHeight;

 const promises = [];

 for ( let x= nw.x ; x <= se.x;x++){
    for (let y=nw.y ; y<=se.y;y++){

        promises.push(
            axios.get(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,{responseType:"arraybuffer"}).then(imageres => ({
                        input: Buffer.from(imageres.data),
                        top: (y - nw.y) * tileHeight,
                        left: (x - nw.x) * tileWidth
                    }))
        )
    }
 }

  const finalmap = await Promise.all(promises);

        // Step 4: Stitch tiles into one image
        const buffer = await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
            .composite(finalmap)
            .png()
            .toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.send(buffer);

})



//this route is to get all the nodes on the trek and find out the distance of the trek with the help of haversine function which calculates the distance b/w the two nodes


function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
}

router.get("/treks/:place", async (req: Request, res: Response) => {
    try {
        const { place } = req.params;

        // 1️⃣ Get bounding box from Nominatim
        const geoRes = await axios.get(
            `https://nominatim.openstreetmap.org/search?q=${place}&format=json&limit=1`
        );
        if (!geoRes.data.length) {
            return res.status(404).json({ error: "Place not found" });
        }

        const bbox = geoRes.data[0].boundingbox; // [south, north, west, east]
        const south = bbox[0];
        const north = bbox[1];
        const west = bbox[2];
        const east = bbox[3];

        // 2️⃣ Query trek paths from Overpass
        const query = `
        [out:json];
        (
          way["highway"="path"](${south},${west},${north},${east});
          relation["route"="hiking"](${south},${west},${north},${east});
        );
        (._;>;);
        out body;
        `;

        const overpassRes = await axios.post(
            "https://overpass-api.de/api/interpreter",
            query,
            { headers: { "Content-Type": "text/plain" } }
        );

        const elements = overpassRes.data.elements; 

        // 3️⃣ Extract trek nodes (lat/lon)
        const nodes = elements
            .filter((el: any) => el.type === "node")
            .map((n: any) => ({ lat: n.lat, lon: n.lon }));

        if (nodes.length === 0) {
            return res.json({ msg: "No trek paths found" });
        }

        // 4️⃣ Get elevations (batch request to Open-Elevation API)
        const coords = nodes.map((n:any) => `${n.lat},${n.lon}`).join("|");
        const elevRes = await axios.get(
            `https://api.open-elevation.com/api/v1/lookup?locations=${coords}`
        );

        const elevations = elevRes.data.results;

        // 5️⃣ Calculate total distance & elevation gain
        let distance = 0;
        let elevationGain = 0;
        let elevationLoss = 0;

        for (let i = 1; i < elevations.length; i++) {
            const prev = elevations[i - 1];
            const curr = elevations[i];

            // distance
            distance += haversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);

            // elevation gain/loss
            const diff = curr.elevation - prev.elevation;
            if (diff > 0) elevationGain += diff;
            else elevationLoss += Math.abs(diff);
        }

        res.json({
            place,
            totalDistance_m: Math.round(distance),
            elevationGain_m: Math.round(elevationGain),
            elevationLoss_m: Math.round(elevationLoss),
            nodes: elevations
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

//// this route is when the user search for the location (we know our api will give the location when we give the exact name for that location) so this will solve this problem (in this we will only search the name and the api will give us the suggestions)

router.get("/search",async(req:Request,res:Response)=>{
    const q= req.query.q as string;
    if(!q){
        return res.status(Status.NotFound).json({
            msg:"query missing"
        })
    }

    const resp = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}$limit=5&addressdetails=1`)
    
    const result = resp.data.map((item:any)=>{
        name: item.display_name
    })

    res.json({
        result
    })
})




export default router;
