import { Blobatar } from "@blobatar/react";
import "blobatar/motion.css";

export default function Avatar ({ name, size=24 }) {
    return (
        <Blobatar name={name} size={size} animate="always"/>
    )
}